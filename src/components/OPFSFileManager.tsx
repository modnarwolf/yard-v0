import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Folder, ChevronRight, X, Move } from 'lucide-react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface FileTreeItem {
  name: string;
  type: 'file' | 'directory';
  children?: FileTreeItem[];
}

export function OPFSFileManager() {
 console.log("OPFS RUNNING...");
 
  const [root, setRoot] = useState<FileSystemDirectoryHandle | null>(null);
  const [fileTree, setFileTree] = useState<FileTreeItem[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [newDirName, setNewDirName] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isFileContentModalOpen, setIsFileContentModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState('');
  const [directories, setDirectories] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    initializeOPFS();
  }, []);

  const initializeOPFS = async () => {
    try {
      const rootDir = await navigator.storage.getDirectory();
      setRoot(rootDir);
      await updateFileTree(rootDir);
    } catch (error) {
      console.error('Error initializing OPFS:', error);
      toast({
        title: "Error",
        description: "Failed to initialize file system.",
        variant: "destructive",
      });
    }
  };

  const updateFileTree = async (directory: FileSystemDirectoryHandle, path: string[] = []) => {
    const items: FileTreeItem[] = [];
    for await (const [name, handle] of directory.entries()) {
      if (handle.kind === 'file') {
        items.push({ name, type: 'file' });
      } else if (handle.kind === 'directory') {
        const subItems = await updateFileTree(handle, [...path, name]);
        items.push({ name, type: 'directory', children: subItems });
      }
    }
    if (path.length === 0) {
      setFileTree(items);
    }
    return items;
  };

  const createFile = async () => {
    if (!root || !newFileName || !newFileContent) return;
    try {
      let currentDir = root;
      for (const dir of currentPath) {
        currentDir = await currentDir.getDirectoryHandle(dir, { create: true });
      }
      const fileHandle = await currentDir.getFileHandle(newFileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(newFileContent);
      await writable.close();
      await updateFileTree(root);
      setNewFileName('');
      setNewFileContent('');
      toast({
        title: "Success",
        description: "File created successfully.",
      });
    } catch (error) {
      console.error('Error creating file:', error);
      toast({
        title: "Error",
        description: "Failed to create file.",
        variant: "destructive",
      });
    }
  };

  const createDirectory = async () => {
    if (!root || !newDirName) return;
    try {
      let currentDir = root;
      for (const dir of currentPath) {
        currentDir = await currentDir.getDirectoryHandle(dir, { create: true });
      }
      await currentDir.getDirectoryHandle(newDirName, { create: true });
      await updateFileTree(root);
      setNewDirName('');
      toast({
        title: "Success",
        description: "Directory created successfully.",
      });
    } catch (error) {
      console.error('Error creating directory:', error);
      toast({
        title: "Error",
        description: "Failed to create directory.",
        variant: "destructive",
      });
    }
  };

  const deleteItem = async (name: string, isFile: boolean) => {
    if (!root) return;
    try {
      let currentDir = root;
      for (const dir of currentPath) {
        currentDir = await currentDir.getDirectoryHandle(dir, { create: false });
      }
      await currentDir.removeEntry(name, { recursive: !isFile });
      await updateFileTree(root);
      toast({
        title: "Success",
        description: `${isFile ? 'File' : 'Directory'} deleted successfully.`,
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: `Failed to delete ${isFile ? 'file' : 'directory'}.`,
        variant: "destructive",
      });
    }
  };

  const readFile = async (name: string) => {
    if (!root) return;
    try {
      let currentDir = root;
      for (const dir of currentPath) {
        currentDir = await currentDir.getDirectoryHandle(dir, { create: false });
      }
      const fileHandle = await currentDir.getFileHandle(name);
      const file = await fileHandle.getFile();
      const content = await file.text();
      setFileContent(content);
      setSelectedFile(name);
      setIsFileContentModalOpen(true);
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: "Error",
        description: "Failed to read file.",
        variant: "destructive",
      });
    }
  };

  const moveFile = async (oldPath: string[], newPath: string[]) => {
    if (!root) return;
    try {
      let sourceDir = root;
      for (const dir of oldPath.slice(0, -1)) {
        sourceDir = await sourceDir.getDirectoryHandle(dir, { create: false });
      }
      const fileName = oldPath[oldPath.length - 1];
      const fileHandle = await sourceDir.getFileHandle(fileName);
      const file = await fileHandle.getFile();

      let targetDir = root;
      for (const dir of newPath) {
        targetDir = await targetDir.getDirectoryHandle(dir, { create: true });
      }
      const newFileHandle = await targetDir.getFileHandle(fileName, { create: true });
      const writable = await newFileHandle.createWritable();
      await writable.write(await file.arrayBuffer());
      await writable.close();

      await sourceDir.removeEntry(fileName);
      await updateFileTree(root);
      toast({
        title: "Success",
        description: "File moved successfully.",
      });
    } catch (error) {
      console.error('Error moving file:', error);
      toast({
        title: "Error",
        description: "Failed to move file.",
        variant: "destructive",
      });
    }
  };

  const handleMove = (name: string) => {
    setSelectedFile(name);
    updateDirectories(root);
    setIsMoveModalOpen(true);
  };

  const updateDirectories = useCallback((directory: FileSystemDirectoryHandle, path: string = '') => {
    const updateDirs = async () => {
      const dirs: string[] = [path];
      for await (const [name, handle] of directory.entries()) {
        if (handle.kind === 'directory') {
          const subPath = path ? `${path}/${name}` : name;
          dirs.push(subPath);
          dirs.push(...await updateDirectories(handle, subPath));
        }
      }
      return dirs;
    };
    updateDirs().then(setDirectories);
  }, []);

  const confirmMove = async () => {
    if (selectedFile && moveTarget) {
      const oldPath = [...currentPath, selectedFile];
      const newPath = moveTarget.split('/').filter(Boolean);
      await moveFile(oldPath, newPath);
      setIsMoveModalOpen(false);
      setMoveTarget('');
    }
  };

  const renderFileTree = (items: FileTreeItem[], depth: number = 0) => {
    return (
      <ul className={`pl-${depth * 4}`}>
        {items.map((item) => (
          <li key={item.name} className="mb-1">
            <div className="flex items-center">
              {item.type === 'directory' && (
                <ChevronRight className="h-4 w-4 mr-1" />
              )}
              <span
                className="cursor-pointer hover:text-blue-500"
                onClick={() => item.type === 'file' ? readFile(item.name) : setCurrentPath([...currentPath, item.name])}
              >
                {item.type === 'file' ? <FileText className="h-4 w-4 inline mr-1" /> : <Folder className="h-4 w-4 inline mr-1" />}
                {item.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteItem(item.name, item.type === 'file')}
                className="ml-2"
              >
                <X className="h-4 w-4" />
              </Button>
              {item.type === 'file' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMove(item.name)}
                  className="ml-2"
                >
                  <Move className="h-4 w-4" />
                </Button>
              )}
            </div>
            {item.children && renderFileTree(item.children, depth + 1)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">OPFS File Manager</h2>
      <div className="mb-4">
        <Input
          type="text"
          value={newFileName}
          onChange={(e) => setNewFileName(e.target.value)}
          placeholder="File name"
          className="mb-2"
        />
        <Input
          type="text"
          value={newFileContent}
          onChange={(e) => setNewFileContent(e.target.value)}
          placeholder="File content"
          className="mb-2"
        />
        <Button onClick={createFile}>Create File</Button>
      </div>
      <div className="mb-4">
        <Input
          type="text"
          value={newDirName}
          onChange={(e) => setNewDirName(e.target.value)}
          placeholder="Directory name"
          className="mb-2"
        />
        <Button onClick={createDirectory}>Create Directory</Button>
      </div>
      <div className="mb-4">
        <Button onClick={() => setCurrentPath(currentPath.slice(0, -1))}>Go Up</Button>
      </div>
      <div className="border p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">File Tree</h3>
        {renderFileTree(fileTree)}
      </div>
      <Dialog open={isFileContentModalOpen} onOpenChange={setIsFileContentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedFile}</DialogTitle>
          </DialogHeader>
          <pre className="bg-gray-100 p-4 rounded whitespace-pre-wrap">{fileContent}</pre>
        </DialogContent>
      </Dialog>
      <Dialog open={isMoveModalOpen} onOpenChange={setIsMoveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move File</DialogTitle>
          </DialogHeader>
          <Select onValueChange={setMoveTarget}>
            <SelectTrigger>
              <SelectValue placeholder="Select destination" />
            </SelectTrigger>
            <SelectContent>
              {directories.map((dir) => (
                <SelectItem key={dir} value={dir}>
                  {dir || 'Root'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={confirmMove}>Move</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

