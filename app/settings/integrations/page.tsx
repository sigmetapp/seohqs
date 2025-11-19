import GoogleAccountsList from '@/app/components/GoogleAccountsList';

export default function SettingsIntegrationsPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Настройки интеграций</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Управление подключенными Google аккаунтами для интеграции с Google Search Console
          </p>
        </div>

        <GoogleAccountsList />
      </div>
    </main>
  );
}
