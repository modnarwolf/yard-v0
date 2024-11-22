import { useState, useEffect } from 'react'
import { DidDht, DidJwk } from '@web5/dids'
import Peer from 'peerjs'
import './App.css'

import { YardChatAppComponent } from './components/yard-chat-app'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function App() {
  const [did, setDid] = useState<string>('')
  const [privateKey, setPrivateKey] = useState<JSON | null>(null)
  // const pkey = privateKey
  const [resolvedDid, setResolvedDid] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [peer, setPeer] = useState<Peer | null>(null)

  useEffect(() => {
    return () => {
      if (peer) {
        peer.destroy()
      }
    }
  }, [peer])

  const createPeer = (peerId: string) => {
    const newPeer = new Peer(peerId, {
      debug: 3,
    })

    newPeer.on('open', (id) => {
      console.log('My peer ID is: ' + id)
    })

    newPeer.on('error', (err) => {
      console.error('PeerJS error:', err)
      setError(`PeerJS error: ${err.type}`)
    })

    setPeer(newPeer)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      if (!privateKey) {
        setError('Private key cannot be empty. Please enter a valid private key.')
        return
      }
      // Import the DID using the private key JSON
      console.log('Attempting to import DID with private key:', privateKey.uri)
      const jsonKey = JSON.parse(privateKey);
      
      const importedDid = await DidDht.import({
          portableDid: jsonKey
        }
      )
      if (!importedDid) {
        throw new Error('Failed to import DID. Imported DID object is undefined.')
      }
      if (!importedDid.uri) {
        console.error('Imported DID:', importedDid)
        throw new Error('Failed to import DID. `uri` property is missing in the imported DID object.')
      }
      console.log('Imported DID:', importedDid)
      setDid(importedDid.uri)
      const didDocument = await resolveDidDocument(importedDid.uri)
      if (!didDocument) {
        throw new Error('DID could not be resolved')
      }
      setResolvedDid(didDocument)
      const peerId = importedDid.uri.split(':').pop() || ''
      createPeer(peerId)
      setIsLoggedIn(true)
    } catch (err) {
      console.error('DID resolution error:', err)
      setError(`Failed to resolve DID. ${err instanceof Error ? err.message : 'Unknown error occurred.'}`)
    }
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsCreating(true)
    try {
      const newDid = await createNewDid()
      if (!newDid || !newDid.id) {
        throw new Error('Failed to create a DID')
      }
      setDid(newDid.id)
      setPrivateKey(JSON.stringify(newDid.privateKey))

      // console.log('Generated Private Key JSON:', JSON.stringify(newDid.privateKey, null, 2))
      const resolvedNewDid = await resolveDidDocument(newDid.id)
      if (!resolvedNewDid) {
        throw new Error('Newly created DID could not be resolved')
      }
      setResolvedDid(resolvedNewDid)
      const peerId = newDid.id.split(':').pop() || ''
      createPeer(peerId)
      setIsLoggedIn(true)
    } catch (err) {
      console.error('DID creation error:', err)
      setError(`Failed to create a new DID: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsCreating(false)
    }
  }


  //* EXPORTS DID INFO TO A JSON FILE
  async function exportDidToJson(didDht) {
    try {
      // Export the portable DID
      const portableDid = didDht
      
      // Convert to formatted JSON string
      const jsonString = JSON.stringify(didDht, null, 2);
      
      // Print to console
      console.log('Portable DID:', jsonString);
      
      // Create a blob with the JSON data
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      try {
        // Use the File System Access API to save the file
        const handle = await window.showSaveFilePicker({
          suggestedName: `did-${Date.now()}.json`,
          types: [{
            description: 'JSON Files',
            accept: {
              'application/json': ['.json'],
            },
          }],
        });
        
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        
        console.log('DID saved successfully');
      } catch (error) {
        // Fallback to download if File System Access API is not supported
        // or user cancels the file picker
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `did-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('DID downloaded successfully');
      }
      
      return portableDid;
    } catch (error) {
      console.error('Error exporting DID:', error);
      throw error;
    }
  }

  const createNewDid = async () => {
    try {
      // Using DidDht to create a DID with the 'dht' method and publish it
      const didDht = await DidDht.create({ publish: true })
      // const portableDid = await didDht.export()
      const portableDid = await didDht.export()
      const jsonString = JSON.stringify(portableDid, null, 2);
      console.log('Portable DID:', jsonString);

      //!! EXPORTS DID INFO TO A JSON FILE
      // exportDidToJson(portableDid)

      return { id: didDht.uri, document: didDht.document, privateKey: portableDid.privateKeys[0] }
    } catch (err) {
      throw new Error('Error creating DID: ' + err.message)
    }
  }

  const resolveDidDocument = async (did: string) => {
    try {
      // In this example, the resolve is simulated, as @web5/dids might not have direct resolve functionality yet
      if (!did.startsWith('did:')) {
        throw new Error('Invalid DID format')
      }
      // Assuming resolve means getting the DID document in this context
      return { id: did, document: {} }  // Placeholder for actual DID document resolution
    } catch (err) {
      throw new Error('Error resolving DID: ' + err.message)
    }
  }

  if (isLoggedIn && peer) {
    return <YardChatAppComponent did={did} peer={peer} />
  }

  return (
    <Card className="w-[350px] mx-auto mt-10">
      <CardHeader>
        <CardTitle>YardChat Login</CardTitle>
        <CardDescription>Log in or create an account to start chatting</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="create">Create Account</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="privateKey">Private Key JSON</Label>
                <Input
                  id="privateKey"
                  placeholder='Enter your private key JSON here...'
                  value={privateKey || ''}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">Login</Button>
            </form>
          </TabsContent>
          <TabsContent value="create">
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <Button type="submit" className="w-full" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create New Account'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex flex-col items-start">
        {error && (
          <div className="text-red-500 text-sm">
            <p>Error: {error}</p>
            <p>Please check your network connection and try again.</p>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}

export default App