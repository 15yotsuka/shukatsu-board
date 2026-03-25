export const metadata = {
  title: 'プライバシーポリシー | 就活ボード',
  description: '就活ボードのプライバシーポリシー',
};

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-2xl font-bold mb-2">プライバシーポリシー</h1>
      <p className="text-sm text-gray-500 mb-8">最終更新: 2026年3月24日</p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">1. 収集する情報</h2>
        <p className="text-sm leading-relaxed text-gray-700">
          就活ボード（以下「本アプリ」）は、ユーザーが入力した就職活動に関する情報（企業名・選考状況・スケジュール等）をお使いの端末内にのみ保存します。
          これらのデータはサーバーに送信されず、第三者と共有されることはありません。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">2. 外部データの取得</h2>
        <p className="text-sm leading-relaxed text-gray-700">
          本アプリは、企業の採用締切情報を表示するため、公開されている外部データソースにアクセスします。
          このアクセスにはユーザーの個人情報は含まれません。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">3. データの保存場所</h2>
        <p className="text-sm leading-relaxed text-gray-700">
          入力されたすべてのデータはお使いのデバイス（端末）のローカルストレージにのみ保存されます。
          クラウドへのアップロードやバックアップは行われません。
          アプリを削除した場合、すべてのデータは完全に削除されます。
          また、設定画面の「全企業を削除」機能から、いつでも全データをデバイスから削除できます。
          なお、ユーザーが任意で入力した企業のマイページURL・ログインID・パスワードはデバイス内にのみ保存され、外部に送信されることはありません。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">4. 広告・解析ツール</h2>
        <p className="text-sm leading-relaxed text-gray-700">
          本アプリは広告を表示せず、Google Analytics等の解析ツールも使用していません。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">5. ポリシーの変更</h2>
        <p className="text-sm leading-relaxed text-gray-700">
          本プライバシーポリシーは、必要に応じて変更することがあります。変更した場合は、アプリの更新時またはこのページにてお知らせします。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">6. お問い合わせ</h2>
        <p className="text-sm leading-relaxed text-gray-700">
          プライバシーポリシーに関するご質問は、App Store のサポートページ、またはメール（15yotsuka@gmail.com）よりお問い合わせください。
        </p>
      </section>

      <p className="text-xs text-gray-400 mt-12">
        © 2026 就活ボード. All rights reserved.
      </p>
    </main>
  );
}
