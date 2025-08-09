package handler

import (
	"fmt"
	"mime/multipart"
	"net/http"

	"github.com/labstack/echo/v4"

	"workshop-api/openapi"
	"workshop-api/usecase"

	openapi_types "github.com/oapi-codegen/runtime/types"
)

type fireworkHandler struct {
	Usecase usecase.FireworkUsecase
}

type FireworkHandler interface {
	GetFireworks(ctx echo.Context) error
	GetFireworkById(ctx echo.Context, id int64) error
	CreateFirework(ctx echo.Context) error
	DeleteFirework(ctx echo.Context, id int64) error
	UpdateFirework(ctx echo.Context, id int64) error
}

func NewFireworkHandler(usecase usecase.FireworkUsecase) FireworkHandler {
	return &fireworkHandler{Usecase: usecase}
}

// 花火の一覧を取得
func (h *fireworkHandler) GetFireworks(ctx echo.Context) error {
	fireworks, err := h.Usecase.GetFireworks(ctx.Request().Context())
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to retrieve fireworks"})
	}
	return ctx.JSON(http.StatusOK, fireworks)
}

// IDで指定した花火を取得
func (h *fireworkHandler) GetFireworkById(ctx echo.Context, id int64) error {
	firework, err := h.Usecase.GetFireworkByID(ctx.Request().Context(), id)
	if err != nil {
		return ctx.JSON(http.StatusNotFound, map[string]string{"error": "not found"})
	}
	return ctx.JSON(http.StatusOK, firework)
}

// 花火を作成する(multipart/form-data)
func (h *fireworkHandler) CreateFirework(ctx echo.Context) error {
	// multipart/form-dataの解析
	form, err := ctx.MultipartForm()
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid multipart form")
	}

	// ファイルの取得
	files := form.File["image"]
	if len(files) == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "No image file provided")
	}
	fmt.Println("Received image file handler:", files[0].Size, files[0].Filename, files[0].Header)
	// return echo.NewHTTPError(http.StatusNotImplemented, "CreateFirework not implemented yet")

	// ファイルヘッダーをopenapi_types.Fileに変換
	fileData, err := convertToOpenAPIFile(files[0])
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Failed to convert file")
	}

	// is_shareableの値を取得・変換
	isShareable := false
	if values, exists := form.Value["is_shareable"]; exists && len(values) > 0 {
		isShareable = values[0] == "true"
	}

	// リクエスト構造体の作成
	req := openapi.FireworkCreateRequest{
		Image:       *fileData,
		IsShareable: isShareable,
	}

	// usecaseにリクエストを渡して花火を作成
	firework, err := h.Usecase.CreateFirework(ctx.Request().Context(), req)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return ctx.JSON(http.StatusCreated, firework)
}

// multipart.FileHeader を openapi_types.File に変換するヘルパー関数
func convertToOpenAPIFile(header *multipart.FileHeader) (*openapi_types.File, error) {
	// types.Fileのインスタンスを作成
	fileData := &openapi_types.File{}

	// ポインタレシーバーのメソッドを呼び出し
	fileData.InitFromMultipart(header)

	return fileData, nil
}

// IDで指定した花火を削除
func (h *fireworkHandler) DeleteFirework(ctx echo.Context, id int64) error {
	if err := h.Usecase.DeleteFirework(ctx.Request().Context(), id); err != nil {
		return ctx.JSON(http.StatusNotFound, map[string]string{"error": "not found"})
	}
	return ctx.NoContent(http.StatusNoContent)
}

// IDで指定した花火の共有設定を更新
func (h *fireworkHandler) UpdateFirework(ctx echo.Context, id int64) error {
	var req openapi.FireworkUpdateRequest
	if err := ctx.Bind(&req); err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request"})
	}

	firework, err := h.Usecase.UpdateFirework(ctx.Request().Context(), id, req)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to update firework"})
	}
	return ctx.JSON(http.StatusOK, firework)
}
