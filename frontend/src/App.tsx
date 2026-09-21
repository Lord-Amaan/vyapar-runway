import { APP_TITLE, APP_SUBTITLE } from "./copy";

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-baseline gap-3">
          <h1 className="text-[20px] font-semibold text-gray-900">{APP_TITLE}</h1>
          <span className="text-[14px] text-gray-600">{APP_SUBTITLE}</span>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6" />
    </div>
  );
}
