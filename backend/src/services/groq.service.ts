import Groq from 'groq-sdk';
import { env } from '../config/env';
import { GROQ } from '../config/constants';
import { logger } from '../config/logger';
import { ParsedSymptoms, PatientInsight, DoctorSummary, AIVerdict } from '../types';

const groqClient = new Groq({ apiKey: env.GROQ_API_KEY });

/**
 * Strips markdown code fences from Groq responses before JSON.parse.
 * Groq often wraps JSON in ```json ... ``` blocks.
 */
function stripMarkdownFences(text: string): string {
    return text
        .replace(/^```(?:json)?\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim();
}

/**
 * Safely parses JSON from Groq response.
 * Returns null on failure instead of throwing.
 */
function safeJsonParse<T>(text: string): T | null {
    try {
        const cleaned = stripMarkdownFences(text);
        return JSON.parse(cleaned) as T;
    } catch {
        logger.warn('Failed to parse Groq JSON response', { text: text.slice(0, 200) });
        return null;
    }
}

/**
 * Parses natural language symptom input into structured data.
 * Used for voice/text input from patients.
 */
export async function parseSymptomInput(
    rawInput: string,
    medications: string[],
): Promise<ParsedSymptoms | null> {
    try {
        const medsContext = medications.length > 0
            ? `The patient's medications are: ${medications.join(', ')}.`
            : 'The patient has no listed medications.';

        const response = await groqClient.chat.completions.create({
            model: GROQ.MODEL,
            max_tokens: GROQ.PARSE_MAX_TOKENS,
            temperature: GROQ.STRUCTURED_TEMPERATURE,
            messages: [
                {
                    role: 'system',
                    content: `You are a medical data extraction assistant. Extract symptom data from patient descriptions.
${medsContext}

Return ONLY valid JSON with this exact shape (omit fields not mentioned):
{
  "pain": <1-10 integer>,
  "fatigue": <1-10 integer>,
  "swelling": <1-10 integer>,
  "sleepHours": <number>,
  "mood": <1-10 integer, 10=best>,
  "appetite": <1-10 integer, 10=best>,
  "medicationTaken": { "<medication_name>": <boolean> }
}

Rules:
- Only include fields the patient explicitly or implicitly mentions
- Map descriptive words to numbers (e.g., "terrible pain" = 8-9, "mild pain" = 2-3)
- For medications, infer from context whether they took them
- Return ONLY the JSON object, no explanation`,
                },
                {
                    role: 'user',
                    content: rawInput,
                },
            ],
        });

        const content = response.choices[0]?.message?.content;
        if (!content) return null;

        return safeJsonParse<ParsedSymptoms>(content);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Groq symptom parsing failed', { error: message, input: rawInput.slice(0, 100) });
        return null;
    }
}

/**
 * Generates AI insight for a specific patient based on their recent symptom logs.
 */
export async function generatePatientInsight(
    patientName: string,
    condition: string | null,
    logs: Array<{
        logDate: Date;
        pain: number | null;
        fatigue: number | null;
        swelling: number | null;
        sleepHours: number | null;
        mood: number | null;
        appetite: number | null;
    }>,
): Promise<PatientInsight | null> {
    if (logs.length === 0) return null;

    try {
        const logsStr = logs.map((log) => {
            const date = new Date(log.logDate).toLocaleDateString();
            return `${date}: pain=${log.pain ?? 'N/A'}, fatigue=${log.fatigue ?? 'N/A'}, swelling=${log.swelling ?? 'N/A'}, sleep=${log.sleepHours ?? 'N/A'}h, mood=${log.mood ?? 'N/A'}, appetite=${log.appetite ?? 'N/A'}`;
        }).join('\n');

        const response = await groqClient.chat.completions.create({
            model: GROQ.MODEL,
            max_tokens: GROQ.INSIGHT_MAX_TOKENS,
            temperature: GROQ.NARRATIVE_TEMPERATURE,
            messages: [
                {
                    role: 'system',
                    content: `You are a post-surgical recovery analysis assistant. Analyze the patient's symptom trends and provide a clinical insight.

Return ONLY valid JSON:
{
  "summary": "<2-3 sentence overall assessment>",
  "concerns": ["<concern 1>", "<concern 2>"],
  "positives": ["<positive 1>", "<positive 2>"],
  "recommendation": "<one actionable recommendation>"
}`,
                },
                {
                    role: 'user',
                    content: `Patient: ${patientName}\nCondition: ${condition ?? 'Not specified'}\n\nRecent symptom logs:\n${logsStr}`,
                },
            ],
        });

        const content = response.choices[0]?.message?.content;
        if (!content) return null;

        return safeJsonParse<PatientInsight>(content);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Groq patient insight failed', { error: message, patientName });
        return null;
    }
}

/**
 * Generates AI summary across all of a doctor's patients.
 */
export async function generateDoctorSummary(
    patients: Array<{
        name: string;
        condition: string | null;
        activeEscalations: number;
        latestPain: number | null;
    }>,
): Promise<DoctorSummary | null> {
    if (patients.length === 0) return null;

    try {
        const patientsStr = patients.map((p) =>
            `${p.name} (${p.condition ?? 'N/A'}): ${p.activeEscalations} active alerts, latest pain=${p.latestPain ?? 'N/A'}`,
        ).join('\n');

        const response = await groqClient.chat.completions.create({
            model: GROQ.MODEL,
            max_tokens: GROQ.SUMMARY_MAX_TOKENS,
            temperature: GROQ.NARRATIVE_TEMPERATURE,
            messages: [
                {
                    role: 'system',
                    content: `You are a clinical dashboard assistant. Provide a concise summary for a doctor reviewing their patient roster.

Return ONLY valid JSON:
{
  "overview": "<2-3 sentence summary of the overall patient roster status>",
  "criticalPatients": ["<patient name needing immediate attention>"],
  "actionItems": ["<specific action the doctor should take>"]
}`,
                },
                {
                    role: 'user',
                    content: `Current patients:\n${patientsStr}`,
                },
            ],
        });

        const content = response.choices[0]?.message?.content;
        if (!content) return null;

        return safeJsonParse<DoctorSummary>(content);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Groq doctor summary failed', { error: message });
        return null;
    }
}

/**
 * AI escalation verdict — second layer after rule-based checks.
 * Returns a structured verdict agreeing or disagreeing with rule triggers.
 */
export async function getEscalationVerdict(
    rulesTriggered: string[],
    logs: Array<{
        logDate: Date;
        pain: number | null;
        fatigue: number | null;
        swelling: number | null;
        sleepHours: number | null;
        mood: number | null;
        appetite: number | null;
    }>,
    condition: string | null,
): Promise<AIVerdict | null> {
    try {
        const logsStr = logs.map((log) => {
            const date = new Date(log.logDate).toLocaleDateString();
            return `${date}: pain=${log.pain ?? 'N/A'}, fatigue=${log.fatigue ?? 'N/A'}, swelling=${log.swelling ?? 'N/A'}, sleep=${log.sleepHours ?? 'N/A'}h, mood=${log.mood ?? 'N/A'}, appetite=${log.appetite ?? 'N/A'}`;
        }).join('\n');

        const response = await groqClient.chat.completions.create({
            model: GROQ.MODEL,
            max_tokens: GROQ.ESCALATION_MAX_TOKENS,
            temperature: GROQ.STRUCTURED_TEMPERATURE,
            messages: [
                {
                    role: 'system',
                    content: `You are a clinical escalation analysis AI. Rule-based checks have flagged potential concerns. Analyze the symptom data and provide your independent verdict.

The rules triggered: ${rulesTriggered.join(', ')}
Patient condition: ${condition ?? 'Not specified'}

Return ONLY valid JSON:
{
  "verdict": "ALERT" | "MONITOR" | "NORMAL",
  "reason": "<brief clinical justification>",
  "confidence": <0.0 to 1.0>
}

Guidelines:
- ALERT = genuine clinical concern requiring doctor attention
- MONITOR = mild concern, watch closely
- NORMAL = false alarm or expected recovery pattern
- Consider if the pattern is consistent with normal post-surgical recovery
- Be conservative — false negatives are worse than false positives`,
                },
                {
                    role: 'user',
                    content: `Recent symptom logs:\n${logsStr}`,
                },
            ],
        });

        const content = response.choices[0]?.message?.content;
        if (!content) return null;

        return safeJsonParse<AIVerdict>(content);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Groq escalation verdict failed', { error: message });
        return null;
    }
}
