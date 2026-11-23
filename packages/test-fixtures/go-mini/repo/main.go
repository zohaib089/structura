package main

import (
	"fmt"
	aliased "example.com/mini/pkg/util"
	_ "example.com/mini/pkg/hook"
	"github.com/other/mod/pkg"
)

func main() {
	fmt.Println(aliased.Hello())
}
