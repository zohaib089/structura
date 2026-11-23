package util

import "encoding/json"

func Hello() string {
	return "ok"
}

func unused() {
	_ = json.Marshal
}
