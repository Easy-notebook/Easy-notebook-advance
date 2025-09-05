import React from 'react';
import { AIAgentSidebar } from './Main';

interface RightSideBarProps {
  // Add any props needed for the RightSideBar
}

const RightSideBar: React.FC<RightSideBarProps> = (props) => {
  return <AIAgentSidebar {...props} />;
};

export default RightSideBar;