import { create } from 'zustand';

export interface NodeGroup {
  id: string;
  label: string;
  color: string;
  nodeIds: string[];
}

interface GroupState {
  groups: Record<string, NodeGroup>;

  addGroup: (nodeIds: string[], label: string, color: string) => string;
  removeGroup: (groupId: string) => void;
  removeNodeFromGroup: (nodeId: string) => void;
  getGroupForNode: (nodeId: string) => NodeGroup | null;
  getAllGroupNodeIds: () => Set<string>;
}

let groupCounter = 0;

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: {},

  addGroup: (nodeIds: string[], label: string, color: string) => {
    const groupId = `group-${++groupCounter}-${Date.now()}`;
    const newGroup: NodeGroup = {
      id: groupId,
      label,
      color,
      nodeIds: [...nodeIds],
    };

    set((state) => ({
      groups: {
        ...state.groups,
        [groupId]: newGroup,
      },
    }));

    return groupId;
  },

  removeGroup: (groupId: string) => {
    set((state) => {
      const newGroups = { ...state.groups };
      delete newGroups[groupId];
      return { groups: newGroups };
    });
  },

  removeNodeFromGroup: (nodeId: string) => {
    set((state) => {
      const newGroups: Record<string, NodeGroup> = {};
      for (const [id, group] of Object.entries(state.groups)) {
        if (group.nodeIds.includes(nodeId)) {
          const filteredNodeIds = group.nodeIds.filter((id) => id !== nodeId);
          if (filteredNodeIds.length > 0) {
            newGroups[id] = { ...group, nodeIds: filteredNodeIds };
          }
          // If no nodes left, remove the group entirely
        } else {
          newGroups[id] = group;
        }
      }
      return { groups: newGroups };
    });
  },

  getGroupForNode: (nodeId: string) => {
    const { groups } = get();
    for (const group of Object.values(groups)) {
      if (group.nodeIds.includes(nodeId)) {
        return group;
      }
    }
    return null;
  },

  getAllGroupNodeIds: () => {
    const { groups } = get();
    const nodeIds = new Set<string>();
    for (const group of Object.values(groups)) {
      for (const nodeId of group.nodeIds) {
        nodeIds.add(nodeId);
      }
    }
    return nodeIds;
  },
}));
