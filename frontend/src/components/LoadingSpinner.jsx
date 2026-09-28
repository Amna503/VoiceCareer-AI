export default function LoadingSpinner({ message = "Processing your voice..." }) {
  return (
    <div className="flex items-center gap-2 text-gray-500 py-2" role="status">
      <svg
        className="animate-spin h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      <span className="text-sm">{message}</span>
    </div>
  );
}