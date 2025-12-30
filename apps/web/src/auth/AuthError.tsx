/**
 * OAuth error handler component
 * Displays error message from OAuth flow and provides navigation back to home
 */
export function AuthError() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error") || "Authentication failed";

  return (
    <div className="flex flex-col items-center justify-center h-screen font-sans">
      <h1 className="text-red-600 mb-4">Authentication Error</h1>
      <p className="text-gray-500 mb-6">{error}</p>
      <button
        onClick={() => (window.location.href = "/")}
        className="py-3 px-6 bg-gray-800 text-white border-none rounded-lg cursor-pointer text-base"
      >
        Go Home
      </button>
    </div>
  );
}
