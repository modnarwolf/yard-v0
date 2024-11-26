"use client"

import React, { useState, useEffect } from "react"
import Peer from "peerjs"

//* ICONS
import {
  BadgeCheck,
  Bell,
  ChevronRight,
  ChevronsUpDown,
  Command,
  CreditCard,
  LogOut,
  MessageSquare,
  Send,
  Copy,
  Users,
  Edit2,
  X,
  Leaf,
  Sprout,
  Flower,
  Squirrel,
  FileText,
  Club,
  LifeBuoy,
  Squircle,
} from "lucide-react"


import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { OPFSFileManager } from "./opfsFileManager"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Toaster } from "./ui/toaster"
import { useToast } from "@/hooks/use-toast"

interface YardChatAppComponentProps {
  did: string
  peer: Peer
}

export function YardChatAppComponent({ did, peer }: YardChatAppComponentProps) {
  const [currentPage, setCurrentPage] = useState("connected-peers")
  const [connections, setConnections] = useState<Peer.DataConnection[]>([])
  const [messages, setMessages] = useState<Record<string, { text: string, type: 'self' | 'peer' }[]>>({})
  const [inputMessage, setInputMessage] = useState("")
  const [customPeerNames, setCustomPeerNames] = useState<Record<string, string>>({})
  const [editingPeerId, setEditingPeerId] = useState<string | null>(null)
  const [newPeerName, setNewPeerName] = useState("")
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [inputPeerId, setInputPeerId] = useState("")
  const { toast } = useToast();

  useEffect(() => {
    peer.on("connection", handleIncomingConnection)

    return () => {
      peer.removeListener("connection", handleIncomingConnection)
    }
  }, [peer])

  const copyPeerId = () => {
    if (navigator.clipboard) {
      console.log("PID Copied");
      
      navigator.clipboard.writeText(data.user.pid.split(":")[2]).then(() => {
        toast({
          title: "Peer ID Copied",
          description: "Your Peer ID has been copied to the clipboard.",
        })
      }, (err) => {
        console.error('Could not copy text: ', err);
        toast({
          title: "Copy Failed",
          description: "Failed to copy Peer ID. Please try again.",
          variant: "destructive",
        })
      });
    } else {
      // Fallback for browsers that don't support the Clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = data.user.pid.split(":")[2];
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        toast({
          title: "Peer ID Copied",
          description: "Your Peer ID has been copied to the clipboard.",
        })
      } catch (err) {
        console.error('Could not copy text: ', err);
        toast({
          title: "Copy Failed",
          description: "Failed to copy Peer ID. Please try again.",
          variant: "destructive",
        })
      }
      document.body.removeChild(textArea);
    }
  };

  const handleIncomingConnection = (newConn: Peer.DataConnection) => {
    if (connections.find((conn) => conn.peer === newConn.peer)) {
      return
    }
    newConn.on("open", () => {
      setConnections((prev) => [...prev, newConn])
      setMessages((prevMessages) => ({ ...prevMessages, [newConn.peer]: [] }))
      newConn.on("data", (data) => {
        addMessage(newConn.peer, `${customPeerNames[newConn.peer] || newConn.peer}: ${data}`, "peer")
      })
    })
    newConn.on("close", () => {
      handleDisconnect(newConn.peer)
    })
  }

  const connectToPeer = () => {
    if (!peer || !inputPeerId.trim()) return
    if (connections.find((conn) => conn.peer === inputPeerId)) {
      toast({
        title: "Already connected",
        description: "You are already connected to this peer.",
        variant: "destructive",
      })
      return
    }
    const newConn = peer.connect(inputPeerId)
    handleIncomingConnection(newConn)
    setInputPeerId("")
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (currentPage && currentPage !== "connected-peers" && inputMessage.trim()) {
      const targetConn = connections.find((conn) => conn.peer === currentPage)
      if (targetConn && targetConn.open) {
        targetConn.send(inputMessage)
        addMessage(currentPage, `You: ${inputMessage}`, "self")
      }
      setInputMessage("")
    }
  }

  const addMessage = (peerId: string, message: string, type: 'self' | 'peer') => {
    setMessages((prev) => ({
      ...prev,
      [peerId]: [...(prev[peerId] || []), { text: message, type }],
    }))
  }

  const handleDisconnect = (peerId: string) => {
    const conn = connections.find((c) => c.peer === peerId)
    if (conn) {
      conn.close()
    }
    setConnections((prev) => prev.filter((c) => c.peer !== peerId))
    setMessages((prev) => {
      const newMessages = { ...prev }
      delete newMessages[peerId]
      return newMessages
    })
    if (currentPage === peerId) {
      setCurrentPage("connected-peers")
    }
  }

  const handleRename = (peerId: string) => {
    setEditingPeerId(peerId)
    setNewPeerName(customPeerNames[peerId] || "")
    setIsRenameDialogOpen(true)
  }

  const confirmRename = () => {
    if (newPeerName.trim() && editingPeerId) {
      setCustomPeerNames((prev) => ({ ...prev, [editingPeerId]: newPeerName }))
    }
    setIsRenameDialogOpen(false)
    setEditingPeerId(null)
    setNewPeerName("")
  }

  const renderMainContent = () => {
    if (currentPage === "connected-peers") {
      return (
        <div className="p-4">
          <h2 className="text-2xl font-bold mb-4">Connected Peers</h2>
          <div className="flex items-center gap-2 mb-4">
            <Input
              value={inputPeerId}
              onChange={(e) => setInputPeerId(e.target.value)}
              placeholder="Enter Peer ID to connect"
              className="flex-1"
            />
            <Button onClick={connectToPeer}>Connect</Button>
          </div>
          <ul>
            {connections.map((conn) => (
              <li key={conn.peer} className="flex items-center justify-between mb-2 p-2 bg-gray-100 rounded">
                <span>{customPeerNames[conn.peer] || conn.peer}</span>
                <div>
                  <Button variant="outline" size="sm" onClick={() => handleRename(conn.peer)} className="mr-2">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDisconnect(conn.peer)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )
    } else if (currentPage === "my-files" || currentPage === "shared-files" || currentPage === "favorite-files") {
      console.log("Rendering OPFSFileManager");
      //! IDK WHY NO WORK  
      return (
        <div className="p-4">
          <OPFSFileManager />;
        </div>
      )
    }

    return (
      <>
        <div className="flex-1 overflow-auto p-4">
          {messages[currentPage]?.map((msg, index) => (
            <div key={index} className={`mb-2 ${msg.type === 'self' ? 'text-right' : 'text-left'}`}>
              <span className="inline-block bg-gray-200 rounded px-2 py-1">
                {msg.text}
              </span>
            </div>
          ))}
        </div>
        <form onSubmit={handleSendMessage} className="flex gap-2 p-4">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button type="submit">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </>
    )
  }

  const data = {
    user: {
      name: "YourPeerName",
      pid: did,
      avatar: "/avatars/shadcn.jpg",
    },
    navMain: [
      {
        title: "Peers",
        url: "#",
        icon: Users,
        items: [
          { title: "Connected Peers", url: "#connected-peers" },
        ],
      },
      {
        title: "Chat",
        url: "#",
        icon: MessageSquare,
        items: [],
      },    
      {
        title: "Files",
        url: "#",
        icon: FileText,
        items: [
          { title: "My Files", url: "#my-files" },
          { title: "Shared", url: "#shared-files" },
          { title: "Favorites", url: "#favorite-files" },
        ],
      },
    ],
    navSecondary: [
      {
        title: "Support",
        url: "#",
        icon: LifeBuoy,
      },
      {
        title: "Feedback",
        url: "#",
        icon: Send,
      },
    ],
  }

  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <a href="#">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Leaf className="size-5" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Yard.Software</span>
                    <span className="truncate text-xs">P2P Messaging & More</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
         <SidebarGroup>
            <SidebarMenu>
              {data.navMain.map((item) => (
                <Collapsible key={item.title} asChild>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <button>
                          <item.icon />
                          <span>{item.title}</span>
                        </button>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuAction className="data-[state=open]:rotate-90">
                        <ChevronRight />
                        <span className="sr-only">Toggle {item.title}</span>
                      </SidebarMenuAction>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.title === "Peers" ? (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild onClick={() => setCurrentPage("connected-peers")}>
                              <a href="#connected-peers">
                                <span>Connected Peers</span>
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ) : item.title === "Chat" ? (
                          connections.map((conn) => (
                            <SidebarMenuSubItem key={conn.peer}>
                              <SidebarMenuSubButton asChild onClick={() => setCurrentPage(conn.peer)}>
                                <a href={`#${conn.peer}`}>
                                  <span>{customPeerNames[conn.peer] || conn.peer}</span>
                                </a>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))
                        ) : item.title === "Files" ? (
                          item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild onClick={() => setCurrentPage(subItem.title)}>
                                <a href={subItem.url}>
                                  <span>{subItem.title}</span>
                                </a>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))
                        ) : null }
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          {/* NAV SECONDARY     */}
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                {data.navSecondary.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild size="sm">
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage
                        src={data.user.avatar}
                        alt={data.user.name}
                      />
                      <AvatarFallback className="rounded-lg">YP</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {data.user.name}
                      </span>
                      <span className="truncate text-xs">
                        {data.user.pid}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage
                          src={data.user.avatar}
                          alt={data.user.name}
                        />
                        <AvatarFallback className="rounded-lg">
                          YP
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">
                          {data.user.name}
                        </span>
                        <span className="truncate text-xs">
                          {data.user.pid}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={copyPeerId}>
                    <Copy className="mr-2 h-4 w-4" />
                      Copy Peer ID
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <BadgeCheck className="mr-2 h-4 w-4" />
                      Account
                    </DropdownMenuItem>

                    <DropdownMenuItem>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Billing
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Bell className="mr-2 h-4 w-4" />
                      Notifications
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">Yard Chat</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {currentPage === "connected-peers" 
                      ? "Connected Peers" 
                      : customPeerNames[currentPage] || currentPage}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col">
          {renderMainContent()}
        </div>
      </SidebarInset>
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Peer</DialogTitle>
          </DialogHeader>
          <Input
            value={newPeerName}
            onChange={(e) => setNewPeerName(e.target.value)}
            placeholder="Enter new name"
          />
          <Button onClick={confirmRename}>Rename</Button>
        </DialogContent>
      </Dialog>
      <Toaster />
      {/* // TEMP CHECKPOINT */}
      {/* <OPFSFileManager /> */}
    </SidebarProvider>
  )
}