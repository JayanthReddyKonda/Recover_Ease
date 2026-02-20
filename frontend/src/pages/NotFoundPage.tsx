import { Link } from "react-router-dom";
import Button from "@/components/Button";

export default function NotFoundPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
            <p className="text-8xl font-bold text-gray-200">404</p>
            <h1 className="mt-4 text-xl font-semibold text-gray-700">Page Not Found</h1>
            <p className="mt-2 text-sm text-gray-500">
                The page you're looking for doesn't exist or has been moved.
            </p>
            <Link to="/" className="mt-6">
                <Button>Go Home</Button>
            </Link>
        </div>
    );
}
