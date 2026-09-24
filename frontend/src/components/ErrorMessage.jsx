export default function ErrorMessage({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 flex items-center justify-between">
      <span className="text-sm">{message}</span>
      <button
        onClick={onDismiss}
        className="text-red-500 hover:text-red-700 ml-3 text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}
