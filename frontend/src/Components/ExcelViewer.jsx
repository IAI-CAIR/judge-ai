import React, { useState, useEffect, useRef } from "react";
import Handsontable from "handsontable";
import "handsontable/dist/handsontable.full.min.css";
import { saveAs } from "file-saver";
import { FaSearch, FaFilter, FaSort, FaDownload, FaCopy, FaExpand, FaCompress } from "react-icons/fa";
import { api } from "../api/api";
import { useLocation } from "react-router-dom";
import { useWebSocket } from "../context/WebSocketContext";


const ExcelViewer = () => {
    const [data, setData] = useState([]);
    const [dynamicHeaders, setDynamicHeaders] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({});
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isSearchActive, setIsSearchActive] = useState(false);
    const tableRef = useRef(null);
    const containerRef = useRef(null);
    const location = useLocation();
    const [bookId, setBookId] = useState(null);
    const [tableHeight, setTableHeight] = useState(580);
    const filenameFromURL = location.state?.filename || localStorage.getItem("filename");
    const [pdfName, setPdfName] = useState("");
    const [pdfUrl, setPdfUrl] = useState(localStorage.getItem("fileUrl") || "");
    const { socket } = useWebSocket();



    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const bookIdFromURL = queryParams.get("bookId") || location.state?.book_id || localStorage.getItem("bookId");

        if (bookIdFromURL) {
            setBookId(bookIdFromURL);
            localStorage.setItem("bookId", bookIdFromURL);
        }

        if (filenameFromURL) {
            setPdfName(filenameFromURL);
            localStorage.setItem("filename", filenameFromURL);
        }

        let updatedFileUrl = location.state?.fileUrl || localStorage.getItem("fileUrl") || "";

        if (updatedFileUrl) {
            console.log("✅ Received fileUrl from state:", updatedFileUrl);

            // Ensure it’s a full URL by prepending the API base URL
            if (!updatedFileUrl.startsWith("http")) {
                updatedFileUrl = `${api}/api/uploads/${updatedFileUrl}`;
            }

            setPdfUrl(updatedFileUrl);
            localStorage.setItem("fileUrl", updatedFileUrl);
        } else {
            console.error("❌ No valid fileUrl found in state or localStorage.");
        }

        console.log("🔗 Final pdfUrl being set:", updatedFileUrl);

    }, [location]);


    useEffect(() => {

        if (!bookId) return;
        const fetchData = async () => {
            try {
                const response = await fetch(`${api}/api/excel-data/${bookId}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                });
                if (!response.ok) throw new Error("Failed to fetch data");
                const backendData = await response.json();

                let allKeys = new Set(["SrNo"]);
                let serialCounter = 1;
                const parsedData = backendData.data.flatMap((chunk) => {
                    try {
                        const events = chunk.Result ? JSON.parse(chunk.Result).Events || [] : [];
                        if (events.length) Object.keys(events[0]).forEach(key => allKeys.add(key));

                        return events.map(event => {
                            // console.log("🔍 Full Event Data:", event);  // Debugging Full Event

                            // const fullPdfUrl = event.pdfUrl ? `${api}/api/uploads/${event.pdfUrl}` : null;

                            // console.log("📄 PDF URL:", fullPdfUrl); // Print pdfUrl for debugging

                            return {
                                SrNo: serialCounter++,
                                ...event,
                                SourceURL: chunk["Source URL"]
                                    ? `<a href='${api}/api/uploads/${chunk["Source URL"]}' target='_blank' class='text-blue-600 '>See Page</a>`
                                    : "N/A",

                                pdfUrl: event.pdfUrl
                                    ? `<a href='${api}/api/uploads/${event.pdfUrl}' target='_blank' class='text-blue-600 '>Open PDF</a>`
                                    : "N/A",


                            };
                        });
                    } catch (error) {
                        console.error("Error parsing JSON for chunk:", chunk, error);
                        return [];
                    }
                });

                // Convert set to array and ensure SourceURL is always last
                let headersArray = Array.from(allKeys).filter(key => key !== "SourceURL");
                headersArray.push("SourceURL"); // Ensure SourceURL is last

                setData(parsedData);
                setDynamicHeaders(headersArray);
            } catch (err) {
                console.error("Error fetching data:", err);
            }
        };
        fetchData();
    }, [bookId]);

    useEffect(() => {
        if (!tableRef.current) return;

        const hot = new Handsontable(tableRef.current, {
            data,
            colHeaders: dynamicHeaders,
            columns: dynamicHeaders.map(header => ({ data: header, renderer: "html" })),
            filters: true,
            dropdownMenu: true,
            columnSorting: true,
            search: true,
            width: "100%",
            height: tableHeight,
            licenseKey: "non-commercial-and-evaluation",
            afterGetColHeader: (col, TH) => {
                TH.style.backgroundColor = "#00b300"; // Dark blue
                TH.style.color = "black";
                TH.style.fontWeight = "bold";
                TH.style.fontSize = "16px";
                TH.style.textAlign = "center";
                TH.style.padding = "3px";
            }
        });

        return () => hot.destroy();
    }, [data, dynamicHeaders, tableHeight]);

    const handleDownload = async () => {
        try {
            const response = await fetch(`${api}/api/export-excel?bookId=${bookId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            const blob = await response.blob();
            saveAs(blob, "structured_data.xlsx");
        } catch (err) {
            console.error("Download error:", err);
        }
    };
    const toggleFullScreen = () => {
        if (isFullScreen) {
            containerRef.current.classList.remove("fixed", "top-0", "left-0", "w-full", "h-full", "bg-white", "z-50", "overflow-auto", "p-4");
            setTableHeight(580);
        } else {
            containerRef.current.classList.add("fixed", "top-0", "left-0", "w-full", "h-full", "bg-white", "z-50", "overflow-auto", "p-4");
            setTableHeight(670);
        }
        setIsFullScreen(!isFullScreen);
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow-md" ref={containerRef}>
            <div className="flex justify-between mb-4">
                <div className="flex gap-2">
                    <button onClick={handleDownload} className="p-2 text-blue-600 rounded hover:bg-gray-300"><FaDownload /></button>
                    <button onClick={toggleFullScreen} className="p-2 text-blue-600 rounded hover:bg-gray-300">
                        {isFullScreen ? <FaCompress /> : <FaExpand />}
                    </button>
                </div>

                <div className="relative group flex-1 text-center">
                    {pdfUrl ? (
                        <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mx-auto text-blue-600 font-medium cursor-pointer hover:underline"
                            title={pdfName}
                        >
                            {pdfName.length > 30
                                ? `${pdfName.substring(0, 30)}...`
                                : pdfName}
                        </a>
                    ) : (
                        <span className="text-gray-500">No PDF Available</span>
                    )}
                </div>

                <div className="relative text-blue-600">
                    {!isSearchActive && (
                        <button onClick={() => setIsSearchActive(true)} className="p-2 text-blue-600 rounded hover:bg-gray-300">
                            <FaSearch />
                        </button>
                    )}
                    {isSearchActive && (
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search..." className="px-3 py-2 border rounded"
                            onBlur={() => setIsSearchActive(searchTerm ? true : false)}
                        />
                    )}
                </div>

            </div>
            <div ref={tableRef} className="border rounded-lg overflow-x-auto"></div>
        </div>
    );
};

export default ExcelViewer;





// import React, { useState, useEffect, useRef } from "react";
// import { saveAs } from "file-saver";
// import { FaSearch, FaFilter, FaSort, FaDownload, FaCopy, FaExpand, FaCompress } from "react-icons/fa";
// import { api } from "../api/api";
// import { useLocation } from "react-router-dom";


// const ExcelViewer = () => {
//     const [data, setData] = useState([]);
//     const [pageSize, setPageSize] = useState(30);
//     const [customPageSize, setCustomPageSize] = useState(30);
//     const [isFullScreen, setIsFullScreen] = useState(false);
//     const [searchTerm, setSearchTerm] = useState("");
//     const [isSearchVisible, setIsSearchVisible] = useState(false);
//     const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
//     const [filters, setFilters] = useState({});
//     const [currentPage, setCurrentPage] = useState(1);
//     const [selectedRows, setSelectedRows] = useState(new Set());
//     const [editableCell, setEditableCell] = useState(null);
//     const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
//     const [activeFilterColumn, setActiveFilterColumn] = useState(null);
//     const [structureData, setstructureData] = useState([]);
//     const [dynamicHeaders, setDynamicHeaders] = useState([]);
//     const location = useLocation();
//     const [bookId, setBookId] = useState(null);

//     const tableRef = useRef(null);
//     const containerRef = useRef(null);
//     console.log("structureData", structureData);

//     useEffect(() => {
//         const queryParams = new URLSearchParams(window.location.search);
//         const bookIdFromURL = queryParams.get("bookId");
//         const bookIdFromState = location.state?.book_id;
//         const storedBookId = localStorage.getItem("bookId"); // Get stored bookId

//         const finalBookId = bookIdFromState || bookIdFromURL || storedBookId; // Use fallback

//         console.log("Final Book ID:", finalBookId);
//         console.log("Full URL:", window.location.href);
//         console.log("Extracted Book ID:", bookIdFromURL);

//         if (finalBookId) {
//             setBookId(finalBookId);
//             localStorage.setItem("bookId", finalBookId); // Save to localStorage
//         }
//     }, [location]); // Run when location changes



//     useEffect(() => {
//         if (!bookId) return;
//         const fetchData = async () => {
//             try {
//                 console.log("Fetching data for Book ID:", bookId);
//                 const response = await fetch(`${api}/api/excel-data/${bookId}`, {
//                     headers: {
//                         Authorization: `Bearer ${localStorage.getItem("token")}`,
//                     },
//                 });

//                 if (!response.ok) {
//                     throw new Error("Failed to fetch data from backend");
//                 }

//                 const backendData = await response.json();
//                 console.log("API Response:", backendData); // Debugging

//                 const dataArray = Array.isArray(backendData.data) ? backendData.data : backendData?.results || [];
//                 if (!dataArray.length) {
//                     console.error("No valid data found:", backendData);
//                     return;
//                 }


//                 // Extract all event keys dynamically
//                 let allKeys = new Set(["SrNo", "SourceURL"]); // Start with fixed keys

//                 // Flatten data dynamically
//                 const parsedData = backendData.data.flatMap(chunk => {
//                     try {
//                         const events = chunk.Result ? JSON.parse(chunk.Result).Events || [] : [];

//                         // Dynamically extract keys from the first event
//                         if (events.length > 0) {
//                             Object.keys(events[0]).forEach(key => allKeys.add(key));
//                         }

//                         return events.map(event => {
//                             let rowData = {
//                                 // ChunkID: chunk["Chunk ID"] || "N/A",
//                                 SrNo: null,
//                                 SourceURL: chunk["Source URL"] || "N/A",
//                             };

//                             // Dynamically add all event properties
//                             Object.keys(event).forEach(key => {
//                                 rowData[key] = Array.isArray(event[key]) ? event[key].join(", ") : event[key] || "N/A";
//                             });

//                             return rowData;
//                         });

//                     } catch (error) {
//                         console.error("Error parsing JSON for chunk:", chunk, error);
//                         return [];
//                     }
//                 });

//                 setstructureData(parsedData);
//                 setDynamicHeaders(Array.from(allKeys));
//                 const numberedData = parsedData.map((row, index) => ({
//                     ...row,
//                     SrNo: row.SrNo || index + 1, // Assigning serial number starting from 1
//                 }));

//                 setstructureData(numberedData);
//                 setDynamicHeaders(Array.from(new Set(["SrNo", ...allKeys.filter(key => key !== "ChunkID")])));

//             } catch (err) {
//                 console.error("Error fetching data:", err);
//             }


//         };

//         fetchData();
//     }, [bookId]);


//     const handleDownload = () => {
//         fetch(`${api}/api/export-excel?bookId=${bookId}`, {
//             headers: {
//                 Authorization: `Bearer ${localStorage.getItem("token")}`,
//             },
//         })
//             .then((res) => {
//                 const contentDisposition = res.headers.get("Content-Disposition");
//                 let filename = "structured_data.xlsx"; // Default filename

//                 if (contentDisposition) {
//                     const match = contentDisposition.match(/filename="(.+)"/);
//                     if (match && match[1]) {
//                         filename = match[1];
//                     }
//                 }

//                 return res.blob().then((blob) => ({ blob, filename }));
//             })
//             .then(({ blob, filename }) => {
//                 saveAs(blob, filename);
//             })
//             .catch((err) => console.error("Download error:", err));
//     };


//     const handleCopy = () => {
//         const tableText = tableRef.current.innerText;
//         navigator.clipboard.writeText(tableText).then(() => {
//             alert("Data copied to clipboard!");
//         });
//     };

//     const handleFullScreen = () => {
//         if (containerRef.current) {
//             containerRef.current.classList.add("fixed", "top-0", "left-0", "w-full", "h-full", "bg-white", "z-50", "overflow-auto", "p-4");
//             setIsFullScreen(true);
//         }
//     };

//     const handleExitFullScreen = () => {
//         if (containerRef.current) {
//             containerRef.current.classList.remove("fixed", "top-0", "left-0", "w-full", "h-full", "bg-white", "z-50", "overflow-auto", "p-4");
//             setIsFullScreen(false);
//         }
//     };

//     const handlePageSizeChange = (e) => {
//         const value = parseInt(e.target.value) || 0;
//         setCustomPageSize(value);
//         if (value > 0 && value <= data.length) {
//             setPageSize(value);
//         }
//     };

//     const handleSearchChange = (e) => {
//         setSearchTerm(e.target.value);
//     };

//     // const handleSort = (key) => {
//     //     let direction = 'asc';
//     //     if (sortConfig.key === key && sortConfig.direction === 'asc') {
//     //         direction = 'desc';
//     //     }
//     //     setSortConfig({ key, direction });
//     // };

//     // const handleFilterChange = (header, value) => {
//     //     setFilters({ ...filters, [header]: value });
//     // };

//     // const handleRowSelect = (index) => {
//     //     const newSelectedRows = new Set(selectedRows);
//     //     if (newSelectedRows.has(index)) {
//     //         newSelectedRows.delete(index);
//     //     } else {
//     //         newSelectedRows.add(index);
//     //     }
//     //     setSelectedRows(newSelectedRows);
//     // };

//     const allHeaders = new Set([...dynamicHeaders]);
//     structureData.forEach((row) => Object.keys(row).forEach((key) => allHeaders.add(key)));
//     const headerArray = Array.from(allHeaders);

//     const filteredData = data.filter((row) => {
//         return headerArray.some((header) => {
//             const cellValue = String(row[header] || '').toLowerCase();
//             return cellValue.includes(searchTerm.toLowerCase());
//         }) && headerArray.every((header) => {
//             const cellValue = String(row[header] || '').toLowerCase();
//             const filterValue = filters[header]?.toLowerCase() || '';
//             return cellValue.includes(filterValue);
//         });
//     });

//     const sortedData = [...filteredData].sort((a, b) => {
//         if (sortConfig.key !== null) {
//             const valueA = a[sortConfig.key] || '';
//             const valueB = b[sortConfig.key] || '';
//             if (valueA < valueB) {
//                 return sortConfig.direction === 'asc' ? -1 : 1;
//             }
//             if (valueA > valueB) {
//                 return sortConfig.direction === 'asc' ? 1 : -1;
//             }
//         }
//         return 0;
//     });

//     const totalPages = Math.ceil(structureData.length / pageSize);
//     const displayData = structureData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

//     const handleBlankField = (value) => (value === "" || value === null || value === undefined ? "-" : value);

//     const highlightText = (text) => {
//         if (!searchTerm) return text;
//         const regex = new RegExp(`(${searchTerm})`, 'gi');
//         return text.replace(regex, '<span class="bg-yellow-200">$1</span>');
//     };

//     const openFilterModal = (header) => {
//         setActiveFilterColumn(header);
//         setIsFilterModalOpen(true);
//     };

//     const closeFilterModal = () => {
//         setIsFilterModalOpen(false);
//         setActiveFilterColumn(null);
//     };


//     const handleOpenPdf = (sourceUrl) => {
//         if (!sourceUrl) return;

//         // Ensure the URL format is correct
//         const [filePath, pageQuery] = sourceUrl.split("#");
//         const pdfUrl = `${api}/api/uploads/${filePath}`; // Adjust according to your API

//         // Extract page number if available
//         const pageNumber = pageQuery ? pageQuery.replace("page=", "") : 1;

//         // Open PDF with page number (if viewer supports it)
//         window.open(`${pdfUrl}#page=${pageNumber}`, "_blank");
//     };

//     return (
//         <div className="p-4 bg-white rounded-lg shadow-md" ref={containerRef}>
//             <div className="flex justify-between mb-4">
//                 <div className="flex gap-2">
//                     <button onClick={handleCopy} className="p-2 text-blue-600  rounded hover:bg-gray-300">
//                         <FaCopy />
//                     </button>
//                     <button onClick={handleDownload} className="p-2 text-blue-600 rounded hover:bg-gray-300">
//                         <FaDownload />
//                     </button>
//                     {!isFullScreen ? (
//                         <button onClick={handleFullScreen} className="p-2 text-blue-600  rounded hover:bg-gray-300">
//                             <FaExpand />
//                         </button>
//                     ) : (
//                         <button onClick={handleExitFullScreen} className="p-2 text-blue-600 rounded hover:bg-red-600">
//                             <FaCompress />
//                         </button>
//                     )}
//                 </div>

//                 <div className="flex gap-2 text-blue-600 items-center">
//                     {isSearchVisible ? (
//                         <input
//                             type="text"
//                             value={searchTerm}
//                             onChange={handleSearchChange}
//                             placeholder="Search..."
//                             className="px-3 py-2 border rounded"
//                             autoFocus
//                         />
//                     ) : (
//                         <button onClick={() => setIsSearchVisible(true)} className="p-2 bg-gray-200 rounded hover:bg-gray-300">
//                             <FaSearch />
//                         </button>
//                     )}
//                     <input
//                         type="number"
//                         value={customPageSize}
//                         onChange={handlePageSizeChange}
//                         placeholder="Rows"
//                         className="px-3 py-2 border rounded"
//                     />
//                 </div>
//             </div>

//             <div ref={tableRef} className="border rounded-lg overflow-x-auto">
//                 <table className="w-full border-collapse border border-gray-300">
//                     <thead className="bg-green-400 sticky top-0">
//                         <tr>
//                             {dynamicHeaders
//                                 .filter(header => header !== "SourceURL") // Exclude SourceURL initially
//                                 .map((header) => (
//                                     <th key={header} className="p-2 border">
//                                         <div className="flex items-center justify-between">
//                                             <span>{header}</span>
//                                             <div className="flex gap-1">
//                                                 <button onClick={() => openFilterModal(header)} className="p-1 hover:bg-gray-300 rounded">
//                                                     <FaFilter />
//                                                 </button>
//                                                 <button onClick={() => handleSort(header)} className="p-1 hover:bg-gray-300 rounded">
//                                                     <FaSort />
//                                                 </button>
//                                             </div>
//                                         </div>
//                                     </th>
//                                 ))}

//                             {/* Ensure SourceURL is always the last column */}
//                             <th key="SourceURL" className="p-2 border">
//                                 <div className="flex items-center justify-between">
//                                     <span>SourceURL</span>
//                                     <div className="flex gap-1">
//                                         <button onClick={() => openFilterModal("SourceURL")} className="p-1 hover:bg-gray-300 rounded">
//                                             <FaFilter />
//                                         </button>
//                                         <button onClick={() => handleSort("SourceURL")} className="p-1 hover:bg-gray-300 rounded">
//                                             <FaSort />
//                                         </button>
//                                     </div>
//                                 </div>
//                             </th>
//                         </tr>
//                     </thead>

//                     <tbody>
//                         {structureData.map((row, index) => (
//                             <tr key={index} className="border-b hover:bg-gray-100">
//                                 {dynamicHeaders
//                                     .filter(header => header !== "SourceURL") // Exclude SourceURL initially
//                                     .map((header) => (
//                                         <td key={header} className="p-2 border">
//                                             {Array.isArray(row[header])
//                                                 ? row[header].join(", ")
//                                                 : handleBlankField(row[header])
//                                             }
//                                         </td>
//                                     ))}

//                                 {/* Ensure SourceURL appears in the last column */}
//                                 {/* <td key="SourceURL" className="p-2 border">
//                 <a href={row.SourceURL} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
//                     Link
//                 </a>
//             </td> */}
//                                 <td key="SourceURL" className="p-2 border">
//                                     <button
//                                         onClick={() => handleOpenPdf(row.SourceURL)}
//                                         className="text-blue-500 underline hover:text-blue-700">
//                                         Open PDF
//                                     </button>
//                                 </td>

//                             </tr>
//                         ))}
//                     </tbody>


//                 </table>
//             </div>

//             <div className="mt-4 flex justify-between items-center">
//                 <div className="text-gray-600">
//                     Showing {displayData.length} of {filteredData.length} filtered rows.
//                 </div>
//                 <div className="flex gap-2">
//                     <button
//                         onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
//                         disabled={currentPage === 1}
//                         className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
//                     >
//                         Previous
//                     </button>
//                     <span>Page {currentPage} of {totalPages}</span>
//                     <button
//                         onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
//                         disabled={currentPage === totalPages}
//                         className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
//                     >
//                         Next
//                     </button>
//                 </div>
//             </div>

//             {isFilterModalOpen && (
//                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
//                     <div className="bg-white p-4 rounded-lg shadow-md">
//                         <h2 className="text-lg font-bold mb-4">Filter by {activeFilterColumn}</h2>
//                         <input
//                             type="text"
//                             value={filters[activeFilterColumn] || ''}
//                             onChange={(e) => handleFilterChange(activeFilterColumn, e.target.value)}
//                             placeholder="Enter filter value"
//                             className="px-3 py-2 border rounded w-full mb-4"
//                         />
//                         <div className="flex justify-end gap-2">
//                             <button onClick={closeFilterModal} className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300">
//                                 Cancel
//                             </button>
//                             <button onClick={closeFilterModal} className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
//                                 Apply
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default ExcelViewer;


