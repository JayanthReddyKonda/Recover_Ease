param([string]$BASE = "http://localhost:8000/api")

$pass = 0; $fail = 0
function Ok($msg)  { $script:pass++; Write-Host "  [PASS] $msg" -ForegroundColor Green }
function Err($msg) { $script:fail++; Write-Host "  [FAIL] $msg" -ForegroundColor Red }
function Section($title) { Write-Host "`n=== $title ===" -ForegroundColor Cyan }

function Call($method, $path, $body=$null, $token=$null) {
    $headers = @{ "Content-Type" = "application/json" }
    if ($token) { $headers["Authorization"] = "Bearer $token" }
    # Support both full URLs and relative paths
    $uri = if ($path -like "http*") { $path } else { "$BASE$path" }
    try {
        $params = @{ Uri=$uri; Method=$method; Headers=$headers; ErrorAction="Stop" }
        if ($body) { $params["Body"] = ($body | ConvertTo-Json -Depth 5) }
        return Invoke-RestMethod @params
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        $detail = ""
        try { $detail = ($_.ErrorDetails.Message | ConvertFrom-Json).detail } catch {}
        return @{ __error=$true; code=$code; detail=$detail }
    }
}

# ─── HEALTH ─────────────────────────────────────────────────────────────
Section "HEALTH"
$h = Invoke-RestMethod "http://localhost:8000/health" -Method GET
if ($h.status -eq "healthy") { Ok "GET /health → healthy" } else { Err "GET /health → $(($h | ConvertTo-Json))" }

# ─── AUTH ────────────────────────────────────────────────────────────────
Section "AUTH — Register"
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$patEmail = "patient_$ts@test.com"
$docEmail = "doctor_$ts@test.com"

$rp = Call POST "/auth/register" @{ name="Test Patient"; email=$patEmail; password="Pass123!"; role="PATIENT" }
if ($rp.data.user.email -eq $patEmail) { Ok "Register patient" } else { Err "Register patient: $($rp | ConvertTo-Json)" }

$rd = Call POST "/auth/register" @{ name="Test Doctor"; email=$docEmail; password="Pass123!"; role="DOCTOR" }
if ($rd.data.user.email -eq $docEmail) { Ok "Register doctor" } else { Err "Register doctor: $($rd | ConvertTo-Json)" }

Section "AUTH — Login"
$lp = Call POST "/auth/login" @{ email=$patEmail; password="Pass123!" }
$patToken = $lp.data.token
if ($patToken) { Ok "Login patient" } else { Err "Login patient failed: $($lp | ConvertTo-Json -Depth 3)" }

$ld = Call POST "/auth/login" @{ email=$docEmail; password="Pass123!" }
$docToken = $ld.data.token
if ($docToken) { Ok "Login doctor" } else { Err "Login doctor failed: $($ld | ConvertTo-Json -Depth 3)" }

Section "AUTH — Profile"
$profile = Call GET "/auth/me" -token $patToken
if ($profile.data.email -eq $patEmail) { Ok "GET /auth/me" } else { Err "GET /auth/me: $($profile | ConvertTo-Json)" }

$upd = Call PATCH "/auth/profile" @{ name="Updated Patient"; whatsapp_phone="" } -token $patToken
if ($upd.data.name -eq "Updated Patient") { Ok "PATCH /auth/profile (name update)" } else { Err "PATCH /auth/profile: $($upd | ConvertTo-Json -Depth 3)" }

# Verify empty phone coerced to null
$profCheck = Call GET "/auth/me" -token $patToken
if ($null -eq $profCheck.data.whatsapp_phone -or $profCheck.data.whatsapp_phone -eq "") { Ok "Empty phone → null (no crash)" } else { Err "Phone should be null, got: $($profCheck.data.whatsapp_phone)" }

# ─── REQUESTS (doctor-patient link) ──────────────────────────────────────
Section "REQUESTS — Send & Accept"
$patId = $lp.data.user.id
$docId = $ld.data.user.id

$sendReq = Call POST "/requests/send" @{ doctor_id=$docId } -token $patToken
if ($sendReq.data.id -or $sendReq.data -or !$sendReq.__error) { Ok "POST /requests/send" } else { Err "POST /requests/send: $($sendReq | ConvertTo-Json)" }

$pendingReqs = Call GET "/requests/pending" -token $docToken
if ($null -ne $pendingReqs.data) { Ok "GET /requests/pending" } else { Err "GET /requests/pending: $($pendingReqs | ConvertTo-Json)" }

$reqId = if ($pendingReqs.data -is [array]) { $pendingReqs.data[0].id } else { $pendingReqs.data.id }
if ($reqId) {
    $acc = Call POST "/requests/$reqId/accept" -token $docToken
    if ($acc.message -match "accept" -or !$acc.__error) { Ok "POST /requests/{id}/accept" } else { Err "Accept request: $($acc | ConvertTo-Json)" }
} else { Err "No pending request found to accept" }

$myPatients = Call GET "/requests/my-patients" -token $docToken
if ($null -ne $myPatients.data) { Ok "GET /requests/my-patients" } else { Err "GET /requests/my-patients: $($myPatients | ConvertTo-Json)" }

# Verify is_active + link_id fields present (the bug we fixed)
$firstPat = if ($myPatients.data -is [array]) { $myPatients.data[0] } else { $myPatients.data }
if ($null -ne $firstPat.is_active -and $firstPat.link_id) { Ok "PatientWithStatus: is_active + link_id present" } else { Err "PatientWithStatus missing fields: $($firstPat | ConvertTo-Json)" }

# ─── SYMPTOM LOGGING ─────────────────────────────────────────────────────
Section "SYMPTOMS"
$sym = Call POST "/symptoms/log" @{ symptom_type="pain"; severity=5; notes="test pain" } -token $patToken
if ($sym.data.id) { Ok "POST /symptoms/log" } else { Err "POST /symptoms/log: $($sym | ConvertTo-Json)" }

$syms = Call GET "/symptoms/my" -token $patToken
if ($null -ne $syms.data) { Ok "GET /symptoms/my" } else { Err "GET /symptoms/my: $($syms | ConvertTo-Json)" }

$trend = Call GET "/symptoms/trend" -token $patToken
if ($null -ne $trend.data) { Ok "GET /symptoms/trend" } else { Err "GET /symptoms/trend: $($trend | ConvertTo-Json)" }

$symSummary = Call GET "/symptoms/summary" -token $patToken
if ($null -ne $symSummary.data -or !$symSummary.__error) { Ok "GET /symptoms/summary" } else { Err "GET /symptoms/summary: $($symSummary | ConvertTo-Json)" }

# ─── CARE PLAN ───────────────────────────────────────────────────────────
Section "CARE PLAN (route order bugfix)"
# These used to return 422 due to /my/* routes being after /{patient_id}
$myPlans = Call GET "/care-plan/my/plans" -token $patToken
if (!$myPlans.__error) { Ok "GET /care-plan/my/plans (was 422 before fix)" } else { Err "GET /care-plan/my/plans: code=$($myPlans.code) $($myPlans.detail)" }

$myTasks = Call GET "/care-plan/my/tasks" -token $patToken
if (!$myTasks.__error) { Ok "GET /care-plan/my/tasks (was 422 before fix)" } else { Err "GET /care-plan/my/tasks: code=$($myTasks.code) $($myTasks.detail)" }

# Doctor: update care plan
$cp = Call PUT "/care-plan/$patId" @{ care_notes="Rest well"; recovery_duration=30 } -token $docToken
if (!$cp.__error) { Ok "PUT /care-plan/{patient_id}" } else { Err "PUT /care-plan/{patient_id}: $($cp | ConvertTo-Json)" }

# Doctor: create task
$task = Call POST "/care-plan/$patId/tasks" @{ title="Take meds"; description="Morning pill"; due_date="2026-03-01"; frequency="daily" } -token $docToken
if ($task.data.id) { Ok "POST /care-plan/{patient_id}/tasks" } else { Err "POST /care-plan/{patient_id}/tasks: $($task | ConvertTo-Json)" }

# Patient: complete task
if ($task.data.id) {
    $taskId = $task.data.id
    $done = Call POST "/care-plan/my/tasks/$taskId/complete" @{ notes="Done!" } -token $patToken
    if (!$done.__error) { Ok "POST /care-plan/my/tasks/{id}/complete" } else { Err "Complete task: $($done | ConvertTo-Json)" }

    $undo = Call POST "/care-plan/my/tasks/$taskId/undo" -token $patToken
    if (!$undo.__error) { Ok "POST /care-plan/my/tasks/{id}/undo" } else { Err "Undo task: $($undo | ConvertTo-Json)" }
}

# ─── PATIENT ENDPOINTS ───────────────────────────────────────────────────
Section "PATIENT"
$sosTest = Call POST "/patient/sos" @{ message="Test SOS" } -token $patToken
if (!$sosTest.__error) { Ok "POST /patient/sos" } else { Err "POST /patient/sos: $($sosTest | ConvertTo-Json)" }

$patDetail = Call GET "/patient/$patId" -token $docToken
if ($patDetail.data.id -or !$patDetail.__error) { Ok "GET /patient/{id} (doctor view)" } else { Err "GET /patient/{id}: $($patDetail | ConvertTo-Json)" }

$patList = Call GET "/patient/my-doctor-patients" -token $docToken
if ($null -ne $patList.data) { Ok "GET /patient/my-doctor-patients" } else { Err "GET /patient/my-doctor-patients: $($patList | ConvertTo-Json)" }

$recov = Call GET "/patient/recovery-stage" -token $patToken
if ($null -ne $recov.data -or !$recov.__error) { Ok "GET /patient/recovery-stage" } else { Err "GET /patient/recovery-stage: $($recov | ConvertTo-Json)" }

$miles = Call GET "/patient/milestones" -token $patToken
if ($null -ne $miles.data) { Ok "GET /patient/milestones" } else { Err "GET /patient/milestones: $($miles | ConvertTo-Json)" }

# ─── AI ENDPOINTS ────────────────────────────────────────────────────────
Section "AI"
$aiIns = Call GET "/ai/insights" -token $patToken
if ($null -ne $aiIns.data -or !$aiIns.__error) { Ok "GET /ai/insights" } else { Err "GET /ai/insights: $($aiIns | ConvertTo-Json)" }

$aiSum = Call GET "/ai/weekly-summary" -token $patToken
if ($null -ne $aiSum.data -or !$aiSum.__error) { Ok "GET /ai/weekly-summary" } else { Err "GET /ai/weekly-summary: $($aiSum | ConvertTo-Json)" }

# ─── SUMMARY ─────────────────────────────────────────────────────────────
Write-Host "`n==============================" -ForegroundColor White
Write-Host " PASSED: $pass  FAILED: $fail" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Yellow" })
Write-Host "==============================" -ForegroundColor White
if ($fail -gt 0) { exit 1 } else { exit 0 }
