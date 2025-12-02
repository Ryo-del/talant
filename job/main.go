package job

import (
	"net/http"
)

type Job struct {
	Id          string `json:"id"`
	Title       string `json:"title"`
	Company     string `json:"company"`
	School      string `json:"school"`
	Description string `json:"description"`
	Salary      string `json:"salary"`
	Skills      string `json:"skills"`
}

func CreateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
}
