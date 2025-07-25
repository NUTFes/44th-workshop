package usecase

import (
	"context"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"net/http"

	"github.com/labstack/echo/v4"

	"fireworks-api-test/domain"
	"fireworks-api-test/openapi"

	"golang.org/x/image/draw"

	"gorm.io/gorm"
)

// fireworkUsecase は花火に関するビジネスロジックを提供する構造体です。
type fireworkUsecase struct {
	db *gorm.DB
}

type FireworkUsecase interface {
	GetFireworks(ctx context.Context) ([]openapi.FireworkResponse, error)
	GetFireworkByID(ctx context.Context, id int64) (openapi.FireworkResponse, error)
	CreateFirework(ctx context.Context, req openapi.FireworkCreateRequest) (openapi.FireworkResponse, error)
	DeleteFirework(ctx context.Context, id int64) error
	UpdateFirework(ctx context.Context, id int64, req openapi.FireworkUpdateRequest) (openapi.FireworkResponse, error)
}

// NewFireworkUsecase は fireworkUsecase の新しいインスタンスを作成します。
func NewFireworkUsecase(db *gorm.DB) FireworkUsecase {
	return &fireworkUsecase{db: db}
}

// GetFireworks は花火の一覧を取得します。
func (uc *fireworkUsecase) GetFireworks(ctx context.Context) ([]openapi.FireworkResponse, error) {
	var fireworks []domain.Firework
	if err := uc.db.Find(&fireworks).Error; err != nil {
		return nil, fmt.Errorf("failed to retrieve fireworks: %w", err)
	}

	// domain.Firework から openapi.FireworkResponse への変換
	var responses []openapi.FireworkResponse
	for _, firework := range fireworks {
		pixelData := bytesToBoolSlice(firework.PixelData) // バイト配列をboolスライスに変換
		responses = append(responses, openapi.FireworkResponse{
			Id:          int64(firework.ID),
			IsShareable: firework.IsShareable,
			PixelData:   pixelData,
			CreatedAt:   &firework.CreatedAt,
			UpdatedAt:   &firework.UpdatedAt,
		})
	}

	return responses, nil
}

// GetFireworkByID は指定されたIDの花火を取得します。
func (uc *fireworkUsecase) GetFireworkByID(ctx context.Context, id int64) (openapi.FireworkResponse, error) {
	var firework domain.Firework
	// IDで花火を取得
	if err := uc.db.First(&firework, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return openapi.FireworkResponse{}, echo.NewHTTPError(http.StatusNotFound, "Firework not found")
		}
		return openapi.FireworkResponse{}, fmt.Errorf("failed to retrieve firework with id %d: %w", id, err)
	}

	// byteスライスをboolスライスに変換
	pixelData := bytesToBoolSlice(firework.PixelData)
	// if pixelData == nil {
	// 	fmt.Println("Invalid pixel data for firework with id:", id)
	// 	return openapi.FireworkResponse{}, fmt.Errorf("invalid pixel data for firework with id %d", id)
	// }

	// レスポンスを構築
	response := openapi.FireworkResponse{
		Id:          int64(firework.ID), // uint から int64 への型変換
		IsShareable: firework.IsShareable,
		PixelData:   pixelData,
		CreatedAt:   &firework.CreatedAt,
		UpdatedAt:   &firework.UpdatedAt,
	}

	return response, nil
}

// CreateFirework は新しい花火を作成します。
func (uc *fireworkUsecase) CreateFirework(ctx context.Context, req openapi.FireworkCreateRequest) (openapi.FireworkResponse, error) {
	// リクエストから画像データを取得
	fmt.Println("Received image file usecase:", req.Image.Filename(), "Size:", req.Image.FileSize())

	// types.Fileからファイル内容を読み取り
	file, err := req.Image.Bytes()
	if err != nil {
		return openapi.FireworkResponse{}, fmt.Errorf("failed to open image file: %w", err)
	}
	fmt.Println("Image file size:", file)

	// 画像のReaderを取得
	reader, err := req.Image.Reader() // 画像のデコード（JPEG, PNG対応）

	// 画像をimage.Image型にdecodeします
	img, _, err := image.Decode(reader)
	if err != nil {
		return openapi.FireworkResponse{}, fmt.Errorf("failed to decode image: %w", err)
	}
	reader.Close()

	// リサイズ
	const width = 54 // リサイズ後のサイズ
	const height = 54
	dstRect := image.Rect(0, 0, width, height)                                     // リサイズ先の矩形を定義
	resized := image.NewRGBA(dstRect)                                              // 新しいRGBA画像を作成
	draw.ApproxBiLinear.Scale(resized, dstRect, img, img.Bounds(), draw.Over, nil) // 画像をリサイズ

	// 2値化 + []byte に変換（白：1, 黒：0）
	threshold := uint8(128)                       // グレースケール化の閾値
	binaryPixels := make([]byte, 0, width*height) // 指定のサイズで初期化

	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			r, g, b, _ := resized.At(x, y).RGBA()
			gray := uint8((r + g + b) / 3 >> 8) // グレースケール化
			if gray > threshold {
				binaryPixels = append(binaryPixels, 1)
			} else {
				binaryPixels = append(binaryPixels, 0)
			}
		}
	}
	fmt.Println("Binary pixel data length:", len(binaryPixels)) // デバッグ用ログ
	fmt.Println("Binary pixel data:", binaryPixels)             // デバッグ用ログ

	// // csvファイルの作成
	// // ファイル作成
	// output_file, err := os.Create("output.csv")
	// if err != nil {
	// 	panic(err)
	// }
	// defer output_file.Close()

	// writer := csv.NewWriter(output_file)
	// defer writer.Flush()

	// // widthごとに行を分けてCSV出力
	// for i := 0; i < len(binaryPixels); i += width {
	// 	end := i + width
	// 	if end > len(binaryPixels) {
	// 		end = len(binaryPixels)
	// 	}

	// 	row := make([]string, end-i)
	// 	for j := i; j < end; j++ {
	// 		row[j-i] = strconv.Itoa(int(binaryPixels[j]))
	// 	}

	// 	if err := writer.Write(row); err != nil {
	// 		fmt.Println("CSV書き込みエラー:", err)
	// 		// return
	// 	}
	// }

	// fmt.Println("CSVファイル 'output.csv' が作成されました。")

	// ドメインオブジェクトを作成
	firework := domain.Firework{
		IsShareable: req.IsShareable,
		PixelData:   binaryPixels, // 2値化されたピクセルデータを設定
	}

	// データベースに保存
	if err := uc.db.WithContext(ctx).Create(&firework).Error; err != nil {
		return openapi.FireworkResponse{}, fmt.Errorf("failed to create firework: %w", err)
	}

	// byteスライスをboolスライスに変換
	pixelData := bytesToBoolSlice(firework.PixelData)
	response := openapi.FireworkResponse{
		Id:          int64(firework.ID), // uint から int64 への型変換
		IsShareable: firework.IsShareable,
		PixelData:   pixelData,
		CreatedAt:   &firework.CreatedAt,
		UpdatedAt:   &firework.UpdatedAt,
	}

	return response, nil
}

// DeleteFirework は指定されたIDの花火を削除します。
func (uc *fireworkUsecase) DeleteFirework(ctx context.Context, id int64) error {
	if err := uc.db.Delete(&domain.Firework{}, id).Error; err != nil {
		return fmt.Errorf("failed to delete firework with id %d: %w", id, err)
	}
	return nil
}

// UpdateFirework は指定されたIDの花火を更新します。
func (uc *fireworkUsecase) UpdateFirework(ctx context.Context, id int64, req openapi.FireworkUpdateRequest) (openapi.FireworkResponse, error) {
	var firework domain.Firework
	if err := uc.db.First(&firework, id).Error; err != nil {
		return openapi.FireworkResponse{}, fmt.Errorf("firework with id %d not found: %w", id, err)
	}

	firework.IsShareable = req.IsShareable

	if err := uc.db.Save(&firework).Error; err != nil {
		return openapi.FireworkResponse{}, fmt.Errorf("failed to update firework: %w", err)
	}

	// byteスライスをboolスライスに変換
	pixelData := bytesToBoolSlice(firework.PixelData)

	response := openapi.FireworkResponse{
		Id:          int64(firework.ID), // uint から int64 への型変換
		IsShareable: firework.IsShareable,
		PixelData:   pixelData,
		CreatedAt:   &firework.CreatedAt,
		UpdatedAt:   &firework.UpdatedAt,
	}

	return response, nil
}

// boolスライスをbyteスライスに変換するヘルパー関数
func boolSliceToBytes(bools []bool) []byte {
	bytes := make([]byte, len(bools))
	for i, b := range bools {
		if b {
			bytes[i] = 1
		} else {
			bytes[i] = 0
		}
	}
	return bytes
}

// byteスライスをboolスライスに変換するヘルパー関数
func bytesToBoolSlice(bytes []byte) []bool {
	bools := make([]bool, len(bytes))
	for i, b := range bytes {
		bools[i] = b != 0
	}
	return bools
}
