import MonacoEditor from '@monaco-editor/react';

export function Editor({ value }: { value: string }) {
  return (
    <MonacoEditor
      theme="hc-black"
      options={{
        readOnly: true,
        minimap: {
          autohide: true,
        },
      }}
      defaultValue={value}
      defaultLanguage="yaml"
      onMount={(_, monaco) => {
        monaco.editor.defineTheme('graph-cli', {
          base: 'hc-black',
          inherit: false,
          rules: [],
          colors: {
            'editor.background': '#FFFFFF',
          },
        });
      }}
    />
  );
}
