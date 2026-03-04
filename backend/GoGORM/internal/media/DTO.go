package media

type UnsplashPhoto struct {
	ID               string `json:"ID"`
	ThumbURL         string `json:"ThumbURL"`
	RegularURL       string `json:"RegularURL"`
	AuthorName       string `json:"AuthorName"`
	AuthorUsername   string `json:"AuthorUsername"`
	AttributionURL   string `json:"AttributionURL"`
	DownloadLocation string `json:"DownloadLocation"`
}

type UnsplashSearchResponse struct {
	Query      string          `json:"Query"`
	Page       int             `json:"Page"`
	PerPage    int             `json:"PerPage"`
	Total      int             `json:"Total"`
	TotalPages int             `json:"TotalPages"`
	Results    []UnsplashPhoto `json:"Results"`
}
