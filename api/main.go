package main

import (
	"fmt"
	"net/http"
	"os"

	"fireworks-api-test/domain"
	"fireworks-api-test/handler"
	"fireworks-api-test/openapi"
	"fireworks-api-test/usecase"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware" // middleware も v4 に変更
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// 環境変数からデータベース接続情報を取得
	dbUser := os.Getenv("POSTGRES_USER")
	dbPassword := os.Getenv("POSTGRES_PASSWORD")
	dbHost := os.Getenv("POSTGRES_HOST")
	dbPort := os.Getenv("POSTGRES_PORT")
	dbName := os.Getenv("POSTGRES_DB")
	// DSNを構築
	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", dbUser, dbPassword, dbHost, dbPort, dbName)
	// DBに接続
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}
	// マイグレーションを実行
	db.AutoMigrate(
		&domain.Firework{},
	)
	// 花火データを作成
	db.Create(&domain.Firework{
		IsShareable: true,
		PixelData:   []byte{1, 0, 1, 0, 1, 0, 1, 0, 1, 0}, // bool スライスをバイト配列に変換
		// PixelData: []bool{true, false, true, false, true, false, true, false, true, false}, // bool スライスを使用
	})
	// idが1のFireworkを取得
	var firework domain.Firework
	if err := db.First(&firework, 1).Error; err != nil {
		fmt.Println("Error retrieving firework:", err)
		return
	}
	fmt.Printf("Retrieved Firework: %+v\n", firework)
	fmt.Println("migrated")

	// Echoのインスタンスを作成
	e := echo.New()

	// ロガーや、パニックからの復帰などのミドルウェアを設定
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	// CORSの設定
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     []string{"http://localhost:8081", "http://127.0.0.1:8081", "http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:3000", "http://127.0.0.1:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true, // クッキーを許可
	}))

	// usecaseのインスタンスを作成
	fireworkUsecase := usecase.NewFireworkUsecase(db)

	// ハンドラのインスタンスを作成
	fireworkHandler := handler.NewFireworkHandler(fireworkUsecase)

	// oapi-codegenが生成したヘルパー関数を使ってルーティングを登録
	// これにより、openapi.yamlに定義したエンドポイントが自動でマッピングされる
	openapi.RegisterHandlers(e, fireworkHandler)

	// 8080ポートでサーバーを起動
	e.Start(":8080")
}
