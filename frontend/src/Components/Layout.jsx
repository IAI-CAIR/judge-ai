import React, { useState } from "react";
import SideBar from "./SideBar";
import NavBar from "./Nav";

const Layout = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="h-screen flex flex-col">
      {/* Navbar Fixed */}
      <div className={`fixed top-0 ${isCollapsed ? 'left-9' : 'left-64'} right-0 h-16 z-10 bg-gray-50 transition-all`}>
        <NavBar />
      </div>

      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <SideBar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

        {/* Dashboard Content Area */}
        <div
          className={`flex-1 ${isCollapsed ? 'ml-0' : 'ml-64'} overflow-auto transition-all`}
        >
          <div className="min-h-[calc(100vh-4rem)] p-6 bg-gray-50">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
