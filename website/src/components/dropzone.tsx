import { fileTypeFromBuffer } from 'file-type/core';
import { useDropzone } from 'react-dropzone';
import type { FileRejection } from 'react-dropzone';
import { uploadFileToIpfs } from '@/lib/ipfs';
import { ImageIcon } from '@radix-ui/react-icons';
import { Input } from './ui/input';
import { useToast } from './ui/use-toast';

const ACCEPTED_IMAGE_TYPES = {
  'image/png': ['.png'],
  'image/jpg': ['.jpg'],
  'image/jpeg': ['.jpeg'],
};

// Limit avatar images to 1mb
const MAX_IMAGE_SIZE = 1_000_000;

const BOX_SIZE = 152;

/**
 * Format bytes as human-readable text.
 * Copied from https://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable-string
 */
function humanFileSize(bytes: number, si = false, dp = 1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }

  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10 ** dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

  return bytes.toFixed(dp) + ' ' + units[u];
}

export function SubgraphImageDropZone(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { toast } = useToast();

  const onDropAccepted = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const fileType = await fileTypeFromBuffer(buffer);

    //check if file type is supported
    if (fileType?.mime && !Object.keys(ACCEPTED_IMAGE_TYPES).includes(fileType.mime)) {
      toast({
        description: 'Images can only be JPG and PNG. Please try again.',
        variant: 'destructive',
      });
      return;
    }
  };

  const onDropRejected = (fileRejections: FileRejection[]) => {
    // Format file size error properly
    if (fileRejections[0]?.errors[0]?.code === 'file-too-large') {
      toast({
        description: `File is larger than ${humanFileSize(MAX_IMAGE_SIZE, true)}`,
        variant: 'destructive',
      });
      return;
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDropAccepted,
    onDropRejected,
    accept: ACCEPTED_IMAGE_TYPES,
    multiple: false,
    maxFiles: 1,
    maxSize: MAX_IMAGE_SIZE,
  });

  const imgSrc = props.value ? (typeof props.value === 'string' ? props.value : null) : null;

  return (
    <div className="relative flex flex-col gap-y-2 md:flex-row md:gap-x-4 items-center">
      <div {...getRootProps()}>
        <Input
          id="picture"
          type="file"
          {...getInputProps({
            onChange: async a => {
              const file = a.target.files?.[0];

              if (!file) {
                toast({
                  description: 'No file selected',
                  variant: 'destructive',
                });
                return;
              }

              const buffer = await file.arrayBuffer();

              // upload file to ipfs
              const ipfsHash = await uploadFileToIpfs({
                path: file.name,
                content: Buffer.from(buffer),
              });

              props.onChange?.({
                ...a,
                target: {
                  ...a.target,
                  value: `https://api.thegraph.com/ipfs/api/v0/cat?arg=${ipfsHash}`,
                },
              });
            },
          })}
        />
        <div className="flex aspect-square h-[152px] w-[152px] cursor-pointer flex-col items-center justify-center gap-y-1 rounded-md border text-center text-base400 hover:opacity-60">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt="subgraph image"
              width={BOX_SIZE}
              height={BOX_SIZE}
              className="h-full rounded-md object-cover"
            />
          ) : (
            <>
              <ImageIcon />
              <p className="hidden font-base text-base-s lg:block">
                Drag your image here or click to upload
              </p>
              <p className="font-base text-base-s lg:hidden">Tap to upload</p>
            </>
          )}
        </div>
      </div>
      <div>
        <p className="w-full font-base text-base-s text-base400">
          Max {humanFileSize(MAX_IMAGE_SIZE, true)}. PNG or JPG only.
          <br />
          800x800 px recommended
        </p>
      </div>
    </div>
  );
}
