import * as React from "react"
import { MessageSquare, Users, FileText, Copy, Loader2, Send, ChevronRight, Edit2 } from "lucide-react"

// import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"

import Peer from "peerjs"
import { ChatBubbleIcon } from "@radix-ui/react-icons"

type Page = "peers" | "chat" | "files" | "groupChat" | string;

type Message = {
  text: string;
  type: "self" | "peer";
};

export function YardChatAppComponent({ did, peer }) {
  const [connections, setConnections] = React.useState<Peer.DataConnection[]>([])
  const [messages, setMessages] = React.useState<{ [key: string]: Message[] }>({})
  const [inputMessage, setInputMessage] = React.useState("")
  const [inputPeerId, setInputPeerId] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState<Page>("peers")
  const [customPeerNames, setCustomPeerNames] = React.useState<{ [key: string]: string }>({})
  const [editingPeerId, setEditingPeerId] = React.useState<string | null>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const { toast } = useToast();

  React.useEffect(() => {
    if (!peer) return;

    peer.on("connection", handleIncomingConnection)

    return () => {
      peer.off("connection", handleIncomingConnection)
    }
  }, [peer])

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, currentPage])

  const handleIncomingConnection = (newConn: Peer.DataConnection) => {
    console.log(`Received connection from peer: ${newConn.peer}`);

    if (connections.find((conn) => conn.peer === newConn.peer)) {
      console.log(`Already connected to peer: ${newConn.peer}`);
      return; // Avoid duplicate connections
    }

    newConn.on("open", () => {
      setConnections((prev) => [...prev, newConn]);
      setMessages((prevMessages) => ({ ...prevMessages, [newConn.peer]: [] }));

      // Handle incoming data
      newConn.on("data", (data) => {
        console.log(`Received message from peer (${newConn.peer}): ${data}`);
        const truncatedPeerId = newConn.peer.slice(-6); // Use last 6 characters for abbreviation
        addMessage(newConn.peer, `Peer (${truncatedPeerId}): ${data}`, "peer");
      });
    });

    newConn.on("error", (err) => {
      console.error("Connection error:", err);
      alert("Failed to connect peer: " + err);
    });
  };

  const connectToPeer = (peerIdToConnect: string) => {
    if (!peer) return;

    if (connections.find(conn => conn.peer === peerIdToConnect)) {
      alert("Already connected to this peer!");
      return;
    }

    console.log(`Attempting to connect to peer ID: ${peerIdToConnect}`);
    setIsLoading(true);

    const newConn = peer.connect(peerIdToConnect);

    newConn.on("open", () => {
      console.log(`Successfully connected to peer: ${peerIdToConnect}`);
      setIsLoading(false);

      setConnections(prev => [...prev, newConn]);
      setMessages((prevMessages) => ({ ...prevMessages, [newConn.peer]: [] }));

      newConn.on("data", (data) => {
        console.log(`Received message from peer (${newConn.peer}): ${data}`);
        const truncatedPeerId = newConn.peer.slice(-6); // Use last 6 characters for abbreviation
        addMessage(newConn.peer, `Peer (${truncatedPeerId}): ${data}`, "peer");
      });
    });

    newConn.on("error", (err) => {
      console.error("Connection error:", err);
      alert("Failed to connect to peer: " + err);
      setIsLoading(false);
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (connections.length > 0 && inputMessage.trim()) {
      const targetConn = connections.find(conn => conn.peer === currentPage);
      if (targetConn && targetConn.open) {
        targetConn.send(inputMessage);
        console.log(`Message sent to ${targetConn.peer.slice(-6)}: ${inputMessage}`);
        addMessage(targetConn.peer, `You: ${inputMessage}`, "self");
      }
      setInputMessage("");
    } else {
      alert("You are not connected to any peers or the message is empty!")
    }
  }

  const addMessage = (peerId: string, message: string, type: "self" | "peer") => {
    setMessages(prev => {
      const updatedMessages = { ...prev };
      if (!updatedMessages[peerId]) {
        updatedMessages[peerId] = [];
      }
      updatedMessages[peerId] = [...updatedMessages[peerId], { text: message, type }];
      return updatedMessages;
    });
  }

  const copyPeerId = () => {
    if (!peer) return;
    navigator.clipboard.writeText(peer.id).then(() => {
      console.log("Peer ID copied to clipboard")
      //! Toast not working
      // toast({ 
      //   title: "CID",
      //   description: "Peer ID Copied to clipboard",
      //   action: (<ToastAction altText="CID"></ToastAction>),
      // })
      alert("Peer ID copied to clipboard!")
    }).catch(err => {
      console.error("Failed to copy Peer ID:", err)
    })
  }

  const disconnectPeer = (peerId: string) => {
    setConnections((prevConnections) => {
      const connToDisconnect = prevConnections.find((conn) => conn.peer === peerId);
      if (connToDisconnect) {
        connToDisconnect.close();
        console.log(`Disconnected from peer: ${peerId}`);
      }
      return prevConnections.filter((conn) => conn.peer !== peerId);
    });
    setMessages((prevMessages) => {
      const updatedMessages = { ...prevMessages };
      delete updatedMessages[peerId];
      return updatedMessages;
    });
    setCustomPeerNames((prevNames) => {
      const updatedNames = { ...prevNames };
      delete updatedNames[peerId];
      return updatedNames;
    });
  };

  const updatePeerName = (peerId: string, newName: string) => {
    setCustomPeerNames(prev => ({ ...prev, [peerId]: newName }))
    setEditingPeerId(null)
  }

  const renderMainContent = () => {
    if (currentPage in messages) {
      return (
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Chat with {customPeerNames[currentPage] || currentPage.slice(-6)}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col h-[calc(100%-4rem)]">
            <div className="flex-1 overflow-y-auto mb-4">
              {(messages[currentPage] || []).map((msg, index) => (
                <div key={index} className={`mb-2 ${msg.type === "self" ? "text-right text-blue-600" : "text-left text-gray-600"}`}>
                  {msg.text}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
              />
              <Button type="submit">
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            </form>
          </CardContent>
        </Card>
      );
    } else {
      switch (currentPage) {
        case "peers":
          return (
            <Card className="flex-1">
              <CardHeader>
                <CardTitle>Connected Peers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      connectToPeer(inputPeerId);
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      value={inputPeerId}
                      onChange={(e) => setInputPeerId(e.target.value)}
                      placeholder="Enter Peer ID"
                    />
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Users className="h-4 w-4 mr-2" />
                      )}
                      Connect
                    </Button>
                  </form>
                </div>
                {connections.length === 0 ? (
                  <p>No peers connected. Use the form above to connect to a peer.</p>
                ) : (
                  <ul>
                    {connections.map((conn, index) => (
                      <li key={index} className="mb-2 flex items-center justify-between">
                        {editingPeerId === conn.peer ? (
                          <form onSubmit={(e) => {
                            e.preventDefault();
                            const input = e.currentTarget.elements.namedItem('peerName') as HTMLInputElement;
                            updatePeerName(conn.peer, input.value);
                          }} className="flex-1 mr-2">
                            <Input
                              name="peerName"
                              defaultValue={customPeerNames[conn.peer] || conn.peer.split(":").pop()}
                              className="w-full"
                              autoFocus
                            />
                          </form>
                        ) : (
                          <span className="flex items-center">
                            {customPeerNames[conn.peer] || conn.peer.split(":").pop()}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingPeerId(conn.peer)}
                              className="ml-2"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </span>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => disconnectPeer(conn.peer)}
                        >
                          Disconnect
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        case "files":
          return (
            <Card className="flex-1">
              <CardHeader>
                <CardTitle>Files</CardTitle>
              </CardHeader>
              <CardContent>
                <p>File sharing functionality placeholder...</p>
              </CardContent>
            </Card>
          );
        default:
          return null;
      }
    }
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-white dark:bg-zinc-950">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" onClick={() => setCurrentPage("chat")}
                   isActive={currentPage === "chat" || currentPage in messages}>
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900">
                    <MessageSquare className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">Chat</span>
                    <span className="text-xs">Connected Chats</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {/* PEERS */}
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setCurrentPage("peers")} isActive={currentPage === "peers"}>
                      <Users className="mr-2 h-4 w-4" />
                      <span>Peers</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {/* CHATS WIP */}
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setCurrentPage("#")} isActive={currentPage === "#"}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      <span>Chat</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {/* FILES */}
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setCurrentPage("files")} isActive={currentPage === "files"}>
                      <FileText className="mr-2 h-4 w-4" />
                      <span>Files</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* CONNECTED CHATS */}
            <SidebarGroup>
              <Collapsible>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex w-full items-center justify-between p-2">
                    Connected Chats
                    <ChevronRight className="h-4 w-4" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {connections.map((conn, index) => (
                        <SidebarMenuItem key={index}>
                          <SidebarMenuButton 
                            onClick={() => setCurrentPage(conn.peer)}
                            className="flex items-center space-x-2 w-full p-2 rounded-md hover:bg-gray-100  dark:hover:bg-gray-800"
                          >
                            <Avatar className="h-6 w-6">
                              {/* <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${conn.peer}`} /> */}
                              <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${conn.peer.slice(0, 2).toUpperCase()}`} />
                              <AvatarFallback>{(customPeerNames[conn.peer] || conn.peer).slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {customPeerNames[conn.peer] || conn.peer.split(":").pop()}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {messages[conn.peer]?.length ? messages[conn.peer][messages[conn.peer].length - 1].text.slice(0, 20) + '...' : 'No messages yet'}
                              </p>
                            </div>
                            <Badge variant="secondary" className="ml-auto">
                              {messages[conn.peer]?.filter(m => m.type === 'peer').length || 0}
                            </Badge>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          </SidebarContent>

          {/* FOOTER */}
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={copyPeerId}>
                  <Copy className="mr-2 h-4 w-4" />
                  <span>Copy Peer ID</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        <main className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-gray-100/40 px-6 dark:bg-gray-800/40">
            <SidebarTrigger />
            <h1 className="font-semibold">Yard Chat</h1>
            <div className="ml-auto text-sm">Your Peer ID: {peer?.id}</div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
            {renderMainContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}