import { defineConfig } from "orval";
// import { customFetch } from "./apiClient/customFetch";

export default defineConfig({
  // 任意の名前
  user_api: {
    input: {
      target: "../openapi.yaml", // OpenAPI のスキーマファイルのパス
    },
    output: {
      target: "./src/apiClient/fireworks", // 生成するファイル群のパス
      schemas: "./src/apiClient/schemas", // スキーマファイルのパス
      client: "react-query", // 生成するクライアントの種類
      httpClient: "fetch", // 生成する HTTP クライアントの種類
      mode: "split", // 生成するファイルを分割するか
      clean: true, // 生成するファイルをクリーンアップするか
      // orval で生成する mock の設定
      // mock: {
      //   type: "msw",
      //   useExamples: true, // openapi.yaml の example を mock データとして使用するか(無い場合は faker.js で mock データが生成される)
      // },
      override: {
        mutator: {
          path: "./src/apiClient/customFetch.ts", // カスタムfetchのパス
          name: "customFetch",
        },
        fetch: {
          includeHttpResponseReturnType: false, // false: fetch の返却値をResponseのデータの型にする
        },
        // ESモジュール対応
        query: {
          useQuery: true,
          useMutation: true,
        },
        // mock: {
        //   required: true, // 自動生成で返却される mock データを必須にする
        // },
      },
    },
    hooks: {
      // ここは、プロジェクトで使用しているフォーマッターに合わせて設定してください
      // afterAllFilesWrite: 'prettier --write', // 例: prettier 生成したファイルを整形
      afterAllFilesWrite: "npx @biomejs/biome format --write", // 例: biome 生成したファイルを整形
    },
  },
});