import { ethers } from 'ethers';

export const compareAbiEvents = async (
  spinner: any,
  toolbox: any,
  dataSource: any,
  newAbiJson: any,
): Promise<boolean> => {
  // Convert to Interface
  const newAbi = new ethers.utils.Interface(newAbiJson);
  // Get events signatures
  const newAbiEvents = Object.keys(newAbi.events);
  // Fetch current dataSource events signatures from subgraph.yaml
  const currentAbiEvents = dataSource.mapping.eventHandlers.map((handler: { event: string }) => {
    return handler.event;
  });
  // Check for renamed or replaced events
  const changedEvents = await eventsDiff(currentAbiEvents, newAbiEvents);
  // const removedEvents = await eventsDiff(currentAbiEvents, newAbiEvents)

  const changed = newAbiEvents.length != currentAbiEvents.length || changedEvents.length != 0;

  if (changed) {
    spinner.warn(
      `Contract events have been changed!\n
      Current events:\n${currentAbiEvents.join('\n')}\n
      New events:\n${newAbiEvents.join('\n')}\n
      Please address the change in your subgraph.yaml and run \`graph codegen\` and graph \`build --network <network>\` from the subgraph folder!`.replace(
        /[ ]{2,}/g,
        '',
      ),
    );
  }

  return changed;
};

const eventsDiff = async (array1: string[], array2: string[]): Promise<string[]> => {
  return array1.filter(x => !array2.includes(x));
};
