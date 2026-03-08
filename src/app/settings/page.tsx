"use client";

export default function SettingsPage() {
  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">設定</h1>

      {/* データタブ */}
      <section>
        <h2 className="text-lg font-semibold mb-4 border-b pb-2">データ</h2>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-1">全企業を削除</h3>
            <p className="text-sm text-gray-500 mb-3">
              登録された全企業データをデバイスから完全に削除します。この操作は取り消せません。
            </p>
            <button
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
              onClick={() => {
                if (confirm("全企業データを削除しますか？この操作は取り消せません。")) {
                  localStorage.clear();
                  alert("削除しました。");
                }
              }}
            >
              全企業を削除
            </button>
          </div>

          {/* プライバシーポリシーリンク */}
          <div className="pt-4 border-t">
            <a
              href="/privacy-policy.html"
              className="text-sm text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              プライバシーポリシー
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
