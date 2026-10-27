import Editor, { DiffEditor, useMonaco } from "@monaco-editor/react";

import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { type FileContents, type FileNode, type ZipDiff } from "./zip";

type Props = ComponentProps<typeof Editor> & {
  node: FileNode;
  diff: ZipDiff;
};

export function Viewer({ node, diff }: Props) {
  const [contents, setContents] = useState<FileContents>();

  useEffect(() => {
    diff.readFile(node.path).then(setContents);
  }, [node, diff]);

  const monaco = useMonaco();

  const language = useMemo(() => {
    if (!node || !monaco) {
      return undefined;
    }

    const name = node.name.toLowerCase();

    const monacoLanguage = monaco.languages
      .getLanguages()
      .find(
        (language) =>
          language.extensions?.some((extension) =>
            name.endsWith(extension.toLowerCase()),
          ) ||
          language.filenames?.some(
            (filename) => name == filename.toLowerCase(),
          ),
      );

    return monacoLanguage?.id ?? "plaintext";
  }, [node, monaco]);

  if (!contents) {
    return <calcite-loader label="" />;
  }

  if (node.status == "modified") {
    return (
      <DiffEditor
        theme="vs-dark"
        language={language}
        original={contents.oldContent ?? ""}
        modified={contents.newContent ?? ""}
        options={{
          readOnly: true,
          renderValidationDecorations: "off",
        }}
      />
    );
  }

  const content =
    node.status == "deleted" ? contents.oldContent : contents.newContent;

  return (
    <Editor
      theme="vs-dark"
      defaultLanguage={language}
      defaultValue={content ?? ""}
      options={{
        readOnly: true,
        renderValidationDecorations: "off",
      }}
    />
  );
}
