return (
  <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-gray-200">
          Cloudflare Drop
        </h1>
        <FileUpload />
      </div>
    </div>
    <div className="fixed bottom-0 w-full py-2 text-center text-sm text-gray-500 dark:text-gray-400">
      版本：{c.env?.VERSION} ({c.env?.DEPLOY_TIME})
    </div>
  </div>
) 