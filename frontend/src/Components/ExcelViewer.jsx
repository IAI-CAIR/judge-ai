import React, { useState, useEffect, useRef } from "react";
import { saveAs } from "file-saver";
import { FaSearch, FaFilter, FaSort, FaDownload, FaCopy, FaExpand, FaCompress } from "react-icons/fa";
import { api } from "../api/api";
import { useLocation } from "react-router-dom";


const ExcelViewer = () => {
    const [data, setData] = useState([]);
    const [pageSize, setPageSize] = useState(30);
    const [customPageSize, setCustomPageSize] = useState(30);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [filters, setFilters] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [editableCell, setEditableCell] = useState(null);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [activeFilterColumn, setActiveFilterColumn] = useState(null);
    const [structureData, setstructureData] = useState([]);
    const [dynamicHeaders, setDynamicHeaders] = useState([]);
    const location = useLocation();
    const [bookId, setBookId] = useState(null);

    const tableRef = useRef(null);
    const containerRef = useRef(null);
    console.log("structureData", structureData);

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const bookIdFromURL = queryParams.get("bookId");
        const bookIdFromState = location.state?.book_id;
        const storedBookId = localStorage.getItem("bookId"); // Get stored bookId

        const finalBookId = bookIdFromState || bookIdFromURL || storedBookId; // Use fallback

        console.log("Final Book ID:", finalBookId);
        console.log("Full URL:", window.location.href);
        console.log("Extracted Book ID:", bookIdFromURL);

        if (finalBookId) {
            setBookId(finalBookId);
            localStorage.setItem("bookId", finalBookId); // Save to localStorage
        }
    }, [location]); // Run when location changes



    useEffect(() => {
        if (!bookId) return;
        const fetchData = async () => {
            try {
                console.log("Fetching data for Book ID:", bookId);
                const response = await fetch(`${api}/api/excel-data/${bookId}`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch data from backend");
                }

                const backendData = await response.json();
                console.log("API Response:", backendData); // Debugging

                const parsedData = backendData.data.map(chunk => {
                    let events = [];
                    try {
                        // Parse the Result string which might be JSON or array of JSON
                        const result = JSON.parse(chunk.Result);
                        if (Array.isArray(result)) {
                            events = result.filter(item => item && typeof item === 'object' && item.Cases)
                                .flatMap(item => item.Cases || []);
                        } else if (result?.Cases) {
                            events = result.Cases;
                        }
                    } catch (error) {
                        console.error("Error parsing JSON for chunk:", chunk, error);
                        return null;
                    }

                    return events.map(event => ({
                        ChunkID: chunk["Chunk ID"] || "N/A",
                        SourceURL: chunk["Source URL"] || "N/A",
                        "Case ID": event["Case ID"] || "N/A",
                        "Parties Involved": Array.isArray(event["Parties Involved"])
                            ? event["Parties Involved"].join(", ")
                            : event["Parties Involved"] || "N/A",
                        "Court Name": event["Court Name"] || "N/A",
                        "Case Type": event["Case Type"] || "N/A",
                        "Judgment Date": event["Judgment Date"] || "N/A",
                        "Judge(s) Name": Array.isArray(event["Judge(s) Name"])
                            ? event["Judge(s) Name"].join(", ")
                            : event["Judge(s) Name"] || "N/A",
                        "Legal Citations": Array.isArray(event["Legal Citations"])
                            ? event["Legal Citations"].join(", ")
                            : event["Legal Citations"] || "N/A",
                        "Judgment Text": event["Judgment Text"] || "N/A",
                        "Summary of Case": event["Summary of Case"] || "N/A",
                        "Verdict/Outcome": event["Verdict/Outcome"] || "N/A",
                        "Legal Provisions Applied": Array.isArray(event["Legal Provisions Applied"])
                            ? event["Legal Provisions Applied"].join(", ")
                            : event["Legal Provisions Applied"] || "N/A",
                        "Appeal Status": event["Appeal Status"] || "N/A",
                        "Advocates/Involved Lawyers": event["Advocates/Involved Lawyers"] || "N/A",
                        "General Comments": event["General Comments"] || "N/A"
                    }));
                }).filter(Boolean).flat();

                setstructureData(parsedData);
                // Set dynamic headers based on the first data object
                if (parsedData.length > 0) {
                    setDynamicHeaders(Object.keys(parsedData[0]));
                }

            } catch (err) {
                console.error("Error fetching data:", err);
            }
        };

        fetchData();
    }, [bookId]);


    const handleDownload = () => {
        fetch(`${api}/api/export-excel?bookId=${bookId}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        })
            .then((res) => {
                const contentDisposition = res.headers.get("Content-Disposition");
                let filename = "structured_data.xlsx"; // Default filename

                if (contentDisposition) {
                    const match = contentDisposition.match(/filename="(.+)"/);
                    if (match && match[1]) {
                        filename = match[1];
                    }
                }

                return res.blob().then((blob) => ({ blob, filename }));
            })
            .then(({ blob, filename }) => {
                saveAs(blob, filename);
            })
            .catch((err) => console.error("Download error:", err));
    };


    const handleCopy = () => {
        const tableText = tableRef.current.innerText;
        navigator.clipboard.writeText(tableText).then(() => {
            alert("Data copied to clipboard!");
        });
    };

    const handleFullScreen = () => {
        if (containerRef.current) {
            containerRef.current.classList.add("fixed", "top-0", "left-0", "w-full", "h-full", "bg-white", "z-50", "overflow-auto", "p-4");
            setIsFullScreen(true);
        }
    };

    const handleExitFullScreen = () => {
        if (containerRef.current) {
            containerRef.current.classList.remove("fixed", "top-0", "left-0", "w-full", "h-full", "bg-white", "z-50", "overflow-auto", "p-4");
            setIsFullScreen(false);
        }
    };

    const handlePageSizeChange = (e) => {
        const value = parseInt(e.target.value) || 0;
        setCustomPageSize(value);
        if (value > 0 && value <= data.length) {
            setPageSize(value);
        }
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleFilterChange = (header, value) => {
        setFilters({ ...filters, [header]: value });
    };

    const filteredData = structureData.filter((row) => {
        return dynamicHeaders.some((header) => {
            const cellValue = String(row[header] || '').toLowerCase();
            return cellValue.includes(searchTerm.toLowerCase());
        }) && dynamicHeaders.every((header) => {
            const cellValue = String(row[header] || '').toLowerCase();
            const filterValue = filters[header]?.toLowerCase() || '';
            return filterValue ? cellValue.includes(filterValue) : true;
        });
    });

    const sortedData = [...filteredData].sort((a, b) => {
        if (sortConfig.key !== null) {
            const valueA = String(a[sortConfig.key] || '').toLowerCase();
            const valueB = String(b[sortConfig.key] || '').toLowerCase();
            if (valueA < valueB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valueA > valueB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        }
        return 0;
    });

    const totalPages = Math.ceil(sortedData.length / pageSize);
    const displayData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const handleBlankField = (value) => (value === "" || value === null || value === undefined ? "-" : value);

    const highlightText = (text) => {
        if (!searchTerm) return text;
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.replace(regex, '<span class="bg-yellow-200">$1</span>');
    };

    const openFilterModal = (header) => {
        setActiveFilterColumn(header);
        setIsFilterModalOpen(true);
    };

    const closeFilterModal = () => {
        setIsFilterModalOpen(false);
        setActiveFilterColumn(null);
    };


    const handleOpenPdf = (sourceUrl) => {
        if (!sourceUrl) return;

        // Ensure the URL format is correct
        const [filePath, pageQuery] = sourceUrl.split("#");
        const pdfUrl = `${api}/api/uploads/${filePath}`; // Adjust according to your API

        // Extract page number if available
        const pageNumber = pageQuery ? pageQuery.replace("page=", "") : 1;

        // Open PDF with page number (if viewer supports it)
        window.open(`${pdfUrl}#page=${pageNumber}`, "_blank");
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow-md" ref={containerRef}>
            <div className="flex justify-between mb-4">
                <div className="flex gap-2">
                    <button onClick={handleCopy} className="p-2 text-cyan-600  rounded hover:bg-gray-300">
                        <FaCopy />
                    </button>
                    <button onClick={handleDownload} className="p-2 text-cyan-600 rounded hover:bg-gray-300">
                        <FaDownload />
                    </button>
                    {!isFullScreen ? (
                        <button onClick={handleFullScreen} className="p-2 text-cyan-600  rounded hover:bg-gray-300">
                            <FaExpand />
                        </button>
                    ) : (
                        <button onClick={handleExitFullScreen} className="p-2 text-cyan-600 rounded hover:bg-red-600">
                            <FaCompress />
                        </button>
                    )}
                </div>

                <div className="flex gap-2 text-cyan-600 items-center">
                    <button className="p-2 rounded hover:bg-cyan-300 bg-cyan-400 text-white cursor-pointer">Chat</button>
                    {isSearchVisible ? (
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={handleSearchChange}
                            placeholder="Search..."
                            className="px-3 py-2 border rounded"
                            autoFocus
                        />
                    ) : (
                        <button onClick={() => setIsSearchVisible(true)} className="p-2 bg-gray-200 rounded hover:bg-gray-300">
                            <FaSearch />
                        </button>
                    )}
                    <input
                        type="number"
                        value={customPageSize}
                        onChange={handlePageSizeChange}
                        placeholder="Rows"
                        className="px-3 py-2 border rounded"
                    />
                </div>
            </div>

            <div ref={tableRef} className="border rounded-lg overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                    <thead className="bg-green-400 sticky top-0">
                        <tr>
                            {dynamicHeaders.map((header) => (
                                <th key={header} className="p-2 border">
                                    <div className="flex items-center justify-between">
                                        <span>{header}</span>
                                        <div className="flex gap-1">
                                            <button onClick={() => openFilterModal(header)} className="p-1 hover:bg-gray-300 rounded">
                                                <FaFilter />
                                            </button>
                                            <button onClick={() => handleSort(header)} className="p-1 hover:bg-gray-300 rounded">
                                                <FaSort />
                                            </button>
                                        </div>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {displayData.map((row, index) => (
                            <tr key={index} className="border-b hover:bg-gray-100">
                                {dynamicHeaders.map((header) => (
                                    <td key={header} className="p-2 border">
                                        {header === "SourceURL" ? (
                                            <button
                                                onClick={() => handleOpenPdf(row.SourceURL)}
                                                className="text-cyan-500 underline hover:text-cyan-700"
                                            >
                                                Open PDF
                                            </button>
                                        ) : (
                                            <div
                                                dangerouslySetInnerHTML={{
                                                    __html: highlightText(handleBlankField(row[header]))
                                                }}
                                            />
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex justify-between items-center">
                <div className="text-gray-600">
                    Showing {displayData.length} of {filteredData.length} filtered rows.
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    >
                        Previous
                    </button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    >
                        Next
                    </button>
                </div>
            </div>

            {isFilterModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h2 className="text-lg font-bold mb-4">Filter by {activeFilterColumn}</h2>
                        <input
                            type="text"
                            value={filters[activeFilterColumn] || ''}
                            onChange={(e) => handleFilterChange(activeFilterColumn, e.target.value)}
                            placeholder="Enter filter value"
                            className="px-3 py-2 border rounded w-full mb-4"
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={closeFilterModal} className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300">
                                Cancel
                            </button>
                            <button onClick={closeFilterModal} className="px-3 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600">
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExcelViewer;


