# カス高 メインストーリー

公開URL: https://ginghum.github.io/cursehighschool-/

目次と本文だけの静的サイトです。本文は `stories.json` で管理します。

## 話を追加する

GitHubで `stories.json` を編集し、`chapters` に以下の形式で追加します。配列の順番が掲載順です。`id` は各話で異なる固定値にしてください。

```json
{
  "chapters": [
    {
      "id": "001",
      "title": "話のタイトル",
      "body": "本文の一段落目。\n\n本文の二段落目。"
    }
  ]
}
```

`\n` は改行、`\n\n` は段落の区切りです。本文に二重引用符を入れる場合は `\"` と記述します。HTMLは使わず、文字として表示されます。mainへの変更後、GitHub Actionsが公開ページを更新します。

## 公開設定

GitHub PagesのSourceは **Deploy from a branch**、Branchは **main**、Folderは **/ (root)** です。mainへの変更が自動公開されます。

## ローカル確認

```sh
python3 -m http.server 8000
```

http://localhost:8000/ を開きます。
