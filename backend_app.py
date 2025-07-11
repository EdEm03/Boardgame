import tornado.ioloop
import tornado.web
import tornado.websocket

class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.write("Boardgame backend running!")

class GameWebSocket(tornado.websocket.WebSocketHandler):
    clients = set()

    def open(self):
        GameWebSocket.clients.add(self)
        print("WebSocket opened")

    def on_message(self, message):
        for client in GameWebSocket.clients:
            if client is not self:
                client.write_message(message)

    def on_close(self):
        GameWebSocket.clients.remove(self)
        print("WebSocket closed")

def make_app():
    return tornado.web.Application([
        (r"/", MainHandler),
        (r"/ws", GameWebSocket),
    ])

if __name__ == "__main__":
    app = make_app()
    app.listen(8888)
    print("Backend running on http://localhost:8888")
    tornado.ioloop.IOLoop.current().start()
