import type { ComponentProps } from "react";
import type { DirectoryNode, FileNode } from "./zip";

type Props = {
  rootNode: DirectoryNode;
  onSelectFile: (node: FileNode) => void;
};

export function Explorer({ rootNode, onSelectFile }: Props) {
  function renderItems(node: DirectoryNode, filter?: boolean) {
    return (
      <calcite-list
        label=""
        scale="s"
        displayMode="nested"
        selectionMode="single-persist"
        selectionAppearance="highlight"
        filterEnabled={filter}
      >
        {node.children.map((node) =>
          node.type == "directory"
            ? renderDirectoryItem(node)
            : renderFileItem(node),
        )}
      </calcite-list>
    );
  }

  function renderDirectoryItem(node: DirectoryNode) {
    return (
      <calcite-list-item
        key={node.path}
        label={node.name}
        expanded={node.hasChanges}
        iconStart={node.hasChanges ? "pencil-square" : undefined}
        style={{
          "--calcite-list-icon-color": node.hasChanges
            ? "var(--calcite-color-status-warning)"
            : "initial",
        }}
        oncalciteListItemSelect={(event) => {
          event.currentTarget.expanded = !event.currentTarget.expanded;
          event.stopPropagation();
        }}
      >
        {renderItems(node)}
      </calcite-list-item>
    );
  }

  function renderFileItem(node: FileNode) {
    let icon: ComponentProps<"calcite-list-item">["iconStart"];
    let color: string;

    if (node.status == "added") {
      icon = "plus-square";
      color = "var(--calcite-color-status-success)";
    } else if (node.status == "modified") {
      icon = "pencil-square";
      color = "var(--calcite-color-status-warning)";
    } else if (node.status == "deleted") {
      icon = "minus-square";
      color = "var(--calcite-color-status-danger)";
    } else {
      icon = undefined;
      color = "initial";
    }

    return (
      <calcite-list-item
        key={node.path}
        label={node.name}
        iconStart={icon}
        style={{
          "--calcite-list-icon-color": color,
        }}
        oncalciteListItemSelect={(event) => {
          onSelectFile(node);
          event.stopPropagation();
        }}
      />
    );
  }

  return renderItems(rootNode);
}
