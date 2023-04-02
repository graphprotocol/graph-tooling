import {
  NewGravatar as NewGravatarEvent,
  UpdatedGravatar as UpdatedGravatarEvent,
} from '../generated/Gravity/Gravity';
import { NewGravatar, UpdatedGravatar } from '../generated/schema';

export function handleNewGravatar(event: NewGravatarEvent): void {
  const newGravatar = new NewGravatar(event.params.id.toHex());
  newGravatar.owner = event.params.owner;
  newGravatar.displayName = event.params.displayName;
  newGravatar.imageUrl = event.params.imageUrl;
  newGravatar.save();
}

export function handleUpdatedGravatar(event: UpdatedGravatarEvent): void {
  const updatedGravatar = new UpdatedGravatar(event.params.id.toHex());
  updatedGravatar.owner = event.params.owner;
  updatedGravatar.displayName = event.params.displayName;
  updatedGravatar.imageUrl = event.params.imageUrl;
  updatedGravatar.save();
}
