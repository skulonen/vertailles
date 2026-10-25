import JSZip from "jszip";

export type FileStatus = "added" | "modified" | "deleted" | "unchanged";

export type FileNode = {
  type: "file";
  name: string;
  path: string;
  status: FileStatus;
  oldSize?: number;
  newSize?: number;
};

export type DirectoryNode = {
  type: "directory";
  name: string;
  path: string;
  children: TreeNode[];
  hasChanges: boolean;
};

export type TreeNode = FileNode | DirectoryNode;

type FileInfo = {
  hash: string;
  size: number;
};

export type FileContents = {
  oldContent: string | null;
  newContent: string | null;
};

export type ZipDiff = {
  tree: DirectoryNode;
  readFile(path: string): Promise<FileContents>;
};

type FileIndex = Map<string, FileInfo>;

export async function compareZipFiles(
  oldZipFile: File,
  newZipFile: File,
): Promise<ZipDiff> {
  const [oldZip, newZip] = await Promise.all([
    JSZip.loadAsync(oldZipFile),
    JSZip.loadAsync(newZipFile),
  ]);

  async function indexFiles(zip: JSZip): Promise<FileIndex> {
    const entries = Object.values(zip.files).filter((file) => !file.dir);

    const indexed = await Promise.all(
      entries.map(async (file) => {
        const content = await file.async("uint8array");

        const hashBuffer = await crypto.subtle.digest(
          "SHA-256",
          content as any,
        );

        const hash = Array.from(new Uint8Array(hashBuffer))
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");

        return [
          file.name,
          {
            hash,
            size: content.byteLength,
          },
        ] as const;
      }),
    );

    return new Map(indexed);
  }

  const [oldFiles, newFiles] = await Promise.all([
    indexFiles(oldZip),
    indexFiles(newZip),
  ]);

  // Build a tree from the union of both archives.
  const root: DirectoryNode = {
    type: "directory",
    name: "",
    path: "",
    children: [],
    hasChanges: false,
  };

  const allPaths = new Set([...oldFiles.keys(), ...newFiles.keys()]);

  for (const path of allPaths) {
    const oldFile = oldFiles.get(path);
    const newFile = newFiles.get(path);

    let status: FileStatus;

    if (!oldFile) {
      status = "added";
    } else if (!newFile) {
      status = "deleted";
    } else if (oldFile.hash !== newFile.hash) {
      status = "modified";
    } else {
      status = "unchanged";
    }

    const segments = path.split("/").filter(Boolean);
    const fileName = segments.pop();

    if (!fileName) continue;

    let current = root;
    let currentPath = "";

    // Create or find parent directories.
    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;

      let directory = current.children.find(
        (node): node is DirectoryNode =>
          node.type === "directory" && node.name === segment,
      );

      if (!directory) {
        directory = {
          type: "directory",
          name: segment,
          path: currentPath,
          children: [],
          hasChanges: false,
        };

        current.children.push(directory);
      }

      current = directory;
    }

    current.children.push({
      type: "file",
      name: fileName,
      path,
      status,
      ...(oldFile ? { oldSize: oldFile.size } : {}),
      ...(newFile ? { newSize: newFile.size } : {}),
    });
  }

  function calculateDirectoryChanges(directory: DirectoryNode): boolean {
    directory.hasChanges = directory.children.some((child) => {
      if (child.type === "file") {
        return child.status !== "unchanged";
      }

      return calculateDirectoryChanges(child);
    });

    return directory.hasChanges;
  }
  calculateDirectoryChanges(root);

  // Sort alphabetically, grouping directories before files.
  function sortTree(directory: DirectoryNode): void {
    directory.children.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }

      return a.name.localeCompare(b.name);
    });

    for (const child of directory.children) {
      if (child.type === "directory") {
        sortTree(child);
      }
    }
  }
  sortTree(root);

  async function readFile(path: string): Promise<FileContents> {
    const oldEntry = oldZip.file(path);
    const newEntry = newZip.file(path);

    const [oldContent, newContent] = await Promise.all([
      oldEntry ? oldEntry.async("string") : null,
      newEntry ? newEntry.async("string") : null,
    ]);

    return { oldContent, newContent };
  }

  return {
    tree: root,
    readFile,
  };
}
