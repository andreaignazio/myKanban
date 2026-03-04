package ws

import (
	"GoGORM/models"
	"encoding/json"
	"sync"
	"time"

	"github.com/google/uuid"
)

type Hub struct {
	register             chan *Client
	unregister           chan *Client
	broadcastToBoard     chan Event
	broadcastToWorkspace chan WorkspaceEvent
	broadcastToUser      chan UserEvent
	rooms                map[string]map[*Client]bool
	workspaceRooms       map[string]map[*Client]bool
	userRooms            map[string]map[*Client]bool
	counter              int
	mu                   sync.Mutex
}

func NewHub() *Hub {
	return &Hub{
		register:             make(chan *Client),
		unregister:           make(chan *Client),
		broadcastToBoard:     make(chan Event, 256),
		broadcastToUser:      make(chan UserEvent, 256),
		broadcastToWorkspace: make(chan WorkspaceEvent, 256),
		rooms:                make(map[string]map[*Client]bool),

		workspaceRooms: make(map[string]map[*Client]bool),
		userRooms:      make(map[string]map[*Client]bool),
		counter:        0,
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if client.boardID != uuid.Nil {
				key := client.boardID.String()
				if _, ok := h.rooms[key]; !ok {
					h.rooms[key] = make(map[*Client]bool)
				}

				h.rooms[key][client] = true

				h.UpdateJoinBoardPresence(key, client)

			}
			if client.workspaceID != uuid.Nil {
				wsKey := client.workspaceID.String()
				if _, ok := h.workspaceRooms[wsKey]; !ok {
					h.workspaceRooms[wsKey] = make(map[*Client]bool)
				}
				h.workspaceRooms[wsKey][client] = true
			}
			if client.userID != uuid.Nil {
				userKey := client.userID.String()
				if _, ok := h.userRooms[userKey]; !ok {
					h.userRooms[userKey] = make(map[*Client]bool)
				}
				h.userRooms[userKey][client] = true
			}
			h.mu.Unlock()

		case client := <-h.unregister:
			//fmt.Println("Unregistering client", client.userID, "boardID", client.boardID, "workspaceID", client.workspaceID)
			h.removeClient(client)

		case evt := <-h.broadcastToBoard:
			evtJson, err := json.Marshal(evt)
			if err != nil {
				continue
			}
			key := evt.BoardID.String()
			h.mu.Lock()
			room := h.rooms[key]
			for client := range room {
				select {
				case client.send <- evtJson:
				default:
					delete(room, client)
					h.closeClientSend(client)
				}
			}
			if len(room) == 0 {
				delete(h.rooms, key)
			}
			h.mu.Unlock()
		case evt := <-h.broadcastToWorkspace:
			evtJson, err := json.Marshal(evt)
			if err != nil {
				continue
			}
			key := evt.WorkspaceID.String()
			h.mu.Lock()
			room := h.workspaceRooms[key]
			for client := range room {
				select {
				case client.send <- evtJson:
				default:
					h.removeClientLocked(client)
				}
			}
			if len(room) == 0 {
				delete(h.workspaceRooms, key)
			}
			h.mu.Unlock()
		case evt := <-h.broadcastToUser:
			evtJson, err := json.Marshal(evt)
			if err != nil {
				continue
			}
			key := evt.RecipientUserID.String()
			h.mu.Lock()
			room := h.userRooms[key]
			for client := range room {
				select {
				case client.send <- evtJson:
				default:
					h.removeClientLocked(client)
				}
			}
			if len(room) == 0 {
				delete(h.userRooms, key)
			}
			h.mu.Unlock()
		}
	}

}

func (h *Hub) removeClient(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.removeClientLocked(c)
}

func (h *Hub) closeClientSend(c *Client) {
	if c == nil || c.send == nil {
		return
	}
	close(c.send)
	c.send = nil
}

func (h *Hub) removeClientLocked(c *Client) {
	if c == nil {
		return
	}
	h.closeClientSend(c)
	if c.boardID != uuid.Nil {
		key := c.boardID.String()
		room := h.rooms[key]

		if room != nil {
			h.UpdateLeaveBoardPresence(key, c)
			delete(room, c)
			if len(room) == 0 {
				delete(h.rooms, key)
			}
		}

	}
	if c.workspaceID != uuid.Nil {
		key := c.workspaceID.String()
		room := h.workspaceRooms[key]
		if room != nil {
			delete(room, c)
			if len(room) == 0 {
				delete(h.workspaceRooms, key)
			}
		}
	}
	if c.userID != uuid.Nil {
		key := c.userID.String()
		room := h.userRooms[key]
		if room != nil {
			delete(room, c)
			if len(room) == 0 {
				delete(h.userRooms, key)
			}
		}
	}
}

func (h *Hub) BroadCastToBoard(evt Event) {
	h.counter++
	evt.ID = uuid.New()
	evt.Counter = h.counter
	select {
	case h.broadcastToBoard <- evt:
	default:
		//
	}
}

func (h *Hub) BroadCastToWorkspace(evt WorkspaceEvent) {
	h.counter++
	evt.ID = uuid.New()
	evt.Counter = h.counter
	select {
	case h.broadcastToWorkspace <- evt:
	default:
		//
	}
}

func (h *Hub) UpdateJoinBoardPresence(key string, client *Client) error {
	//fmt.Println("UpdateJoinBoardPresence", key, client.userID)
	if client == nil || client.userLite == nil {
		return nil
	}
	users := make([]models.UserLite, 0, len(h.rooms[key]))
	for c := range h.rooms[key] {
		if c == nil || c.userLite == nil {
			continue
		}
		users = append(users, *c.userLite)
	}

	payload := BoardPresencePayload{
		Count: len(h.rooms[key]),
		Users: users,
	}
	//fmt.Println("Broadcasting presence snapshot", payload, "room size:", len(h.rooms[key]), "key", key)
	evt := Event{
		Type:    "presence.snapshot",
		BoardID: client.boardID,
		Payload: payload,
		TS:      time.Now(),
	}
	data, _ := json.Marshal(evt)

	select {
	case client.send <- data:
	default:
		delete(h.rooms[key], client)
		h.closeClientSend(client)
	}
	joinEvt := Event{
		Type:    "presence.join",
		BoardID: client.boardID,
		Payload: payload,
		TS:      time.Now(),
	}
	h.BroadCastToBoard(joinEvt)
	return nil

}

func (h *Hub) UpdateLeaveBoardPresence(key string, client *Client) error {
	if client == nil || client.userLite == nil {
		return nil
	}
	users := make([]models.UserLite, 0, 1)
	users = append(users, *client.userLite)

	payload := BoardPresencePayload{
		Count: len(h.rooms[key]) - 1,
		Users: users,
	}
	leaveEvt := Event{
		Type:    "presence.leave",
		BoardID: client.boardID,
		Payload: payload,
		TS:      time.Now(),
	}
	h.BroadCastToBoard(leaveEvt)
	return nil
}

func (h *Hub) BroadCastToUser(evt UserEvent) {
	h.counter++
	evt.ID = uuid.New()
	evt.Counter = h.counter
	select {
	case h.broadcastToUser <- evt:
	default:
		//
	}
}
