package domain

import "gorm.io/gorm"

// 花火の構造体
type Firework struct {
	gorm.Model         // GORMのモデルを埋め込むことで、ID、CreatedAt、UpdatedAt、DeletedAtフィールドを自動的に追加
	IsShareable bool   `gorm:"column:is_shareable"` // 共有可能かどうか
	PixelData   []byte `gorm:"column:pixel_data"`   // ピクセルデータ
}
