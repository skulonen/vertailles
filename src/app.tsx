import { useEffect, useRef, useState } from "react";
import { compareZipFiles, type FileNode, type ZipDiff } from "./zip";
import { Explorer } from "./explorer";
import { Viewer } from "./viewer";

export function App() {
  const [oldFile, setOldFile] = useState<File | null>();
  const [newFile, setNewFile] = useState<File | null>();
  const [selectedNode, setSelectedNode] = useState<FileNode>();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();
  const [diff, setDiff] = useState<ZipDiff>();

  const oldFileInputRef = useRef<HTMLCalciteInputElement>(null);
  const newFileInputRef = useRef<HTMLCalciteInputElement>(null);

  useEffect(() => {
    setError(undefined);
    setDiff(undefined);
    setSelectedNode(undefined);
    if (oldFile && newFile) {
      setLoading(true);
      compareZipFiles(oldFile, newFile)
        .then(setDiff)
        .catch(setError)
        .finally(() => setLoading(false));
    }
  }, [oldFile, newFile]);

  return (
    <>
      <calcite-shell className="calcite-mode-dark">
        <calcite-shell-panel slot="panel-start" resizable>
          <calcite-panel>
            <calcite-block expandable expanded heading="Input files">
              {oldFile && newFile && (
                <calcite-action
                  slot="actions-end"
                  text="Reset"
                  icon="undo"
                  onClick={() => {
                    setOldFile(undefined);
                    setNewFile(undefined);
                    oldFileInputRef.current!.value = "";
                    newFileInputRef.current!.value = "";
                  }}
                />
              )}

              <calcite-label>
                Old file
                <calcite-input
                  ref={oldFileInputRef}
                  type="file"
                  oncalciteInputInput={(event) =>
                    setOldFile(event.currentTarget.files?.item(0))
                  }
                />
              </calcite-label>
              <calcite-label>
                New file
                <calcite-input
                  ref={newFileInputRef}
                  type="file"
                  oncalciteInputInput={(event) =>
                    setNewFile(event.currentTarget.files?.item(0))
                  }
                />
              </calcite-label>
            </calcite-block>

            {diff && (
              <calcite-block
                expandable
                expanded
                heading="Explorer"
                style={{ "--calcite-block-content-space": "0" }}
              >
                <Explorer
                  rootNode={diff.tree}
                  onSelectFile={(node) => setSelectedNode(node)}
                />
              </calcite-block>
            )}
          </calcite-panel>
        </calcite-shell-panel>

        {loading && <calcite-loader label="" scale="l" />}
        {error && (
          <div style={{ margin: "1rem" }}>
            <calcite-notice open icon kind="danger">
              <div slot="title">Failed to read input files</div>
              <div slot="message">{error?.message}</div>
            </calcite-notice>
          </div>
        )}
        {diff && selectedNode && (
          <Viewer key={selectedNode.path} diff={diff} node={selectedNode} />
        )}
      </calcite-shell>
    </>
  );
}
