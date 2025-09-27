export interface EasyNetStateProps {
  // Props for the EasyNet state component
}

export interface GraphData {
  id: string;
  name: string;
  description?: string;
  lastModified: Date;
  data: any; // Graph JSON data
}

export interface EasyNetContextType {
  currentGraph: GraphData | null;
  savedGraphs: GraphData[];
  saveGraph: (name: string, description: string, data: any) => void;
  loadGraph: (id: string) => void;
  deleteGraph: (id: string) => void;
  createNewGraph: () => void;
}