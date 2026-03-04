package rank

import (
	"errors"

	"github.com/morikuni/go-lexorank"
)

type RankGenerator struct {
	generator *lexorank.Generator
}

func NewRankGenerator() *RankGenerator{
	return &RankGenerator{generator: lexorank.NewGenerator()}
}

func (r *RankGenerator) GenerateRankBetween(prevRank, nextRank string) (string, error) {
	key, err := r.generator.Between(lexorank.Key(prevRank), lexorank.Key(nextRank))
	if err != nil {
		return "", err
	}
	return key.String(), err
}

func (r *RankGenerator) GenerateNRankBetween(prevRank, nextRank string, N int)([]string, error){
	if N <= 0 {
		return nil, errors.New("invalid count")
	}
	out := make([]string, 0, N)
	for i:=0; i<N; i++ {
		key, err := r.generator.Between(lexorank.Key(prevRank), lexorank.Key(nextRank))
		if err != nil {
			return nil, err
		}
		out = append(out, key.String())
		prevRank = key.String()
	}
	return out, nil
	
}