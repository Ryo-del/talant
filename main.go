package main

import (
	"fmt"
	"net/http"
	"talant/ankety"
	"talant/auth"
)

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/singin", auth.SingInHandler)
	mux.HandleFunc("/login", auth.LoaginHandler)
	mux.HandleFunc("/checkauth", auth.CheckAuthHandler)
	mux.HandleFunc("/logout", auth.LogOutHandler)

	mux.HandleFunc("/createankety", ankety.CreateHandler)
	mux.HandleFunc("/showankety", ankety.ShowAnketyHandler)
	fs := http.FileServer(http.Dir("./frontend"))
	mux.Handle("/", fs)

	// Оборачиваем роутер в CORS Middleware
	handler := auth.CORSMiddleware(mux)

	fmt.Println("Server starting on :8080")
	http.ListenAndServe(":8080", handler) // Используем обернутый handler
}
