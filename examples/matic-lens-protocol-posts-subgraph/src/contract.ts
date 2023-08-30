import { Bytes, dataSource, DataSourceContext, DataSourceTemplate, ipfs } from "@graphprotocol/graph-ts";
import {
  PostCreated as PostCreatedEvent,
} from "../generated/Contract/Contract"
import { PostContent, PostCreated } from "../generated/schema"

const POST_ID_KEY = "postID";

export function handlePostCreated(event: PostCreatedEvent): void {
  let entity = new PostCreated(
    Bytes.fromUTF8(event.params.profileId.toString()+"-"+event.params.pubId.toString())
  );

  entity.ownerId = event.params.profileId;
  entity.contentURI = event.params.contentURI;
  entity.timestamp = event.params.timestamp;

  entity.save()


  let arweaveIndex = entity.contentURI.indexOf("arweave.net/");
  let ipfsIndex = entity.contentURI.indexOf("/ipfs/");

  if (arweaveIndex == -1 && ipfsIndex == -1) 
    return;
  

  let context = new DataSourceContext();
  context.setBytes(POST_ID_KEY, entity.id);

  if (arweaveIndex != -1) {
    let hash = entity.contentURI.substr(arweaveIndex+12);
    DataSourceTemplate.createWithContext("ArweaveContent", [hash], context);

    return;
  }

  if (ipfsIndex != -1) {
    let hash = entity.contentURI.substr(ipfsIndex+6);
    DataSourceTemplate.createWithContext("IpfsContent", [hash], context);
  }
}

export function handlePostContent(content: Bytes): void {
  let hash = dataSource.stringParam();
  let ctx = dataSource.context();
  let id = ctx.getBytes(POST_ID_KEY);
  
  let post = new PostContent(id);
  post.hash = hash;
  post.content = content.toString();
  post.save()
}
