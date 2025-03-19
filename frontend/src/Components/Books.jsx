import React, { useEffect, useState } from "react";
import axios from "axios";
import { api } from "../api/api";
import { useNavigate, useLocation } from "react-router-dom";


export default function Books() {
  const [books, setBooks] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedBookId, setSelectedBookId] =useState(location.state?.book_id || null);

  useEffect(() => {
    if (location.state?.book_id) {
      setSelectedBookId(location.state.book_id);
    }
  }, [location.state?.book_id]);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await axios.get(`${api}/api/upload-history`, {

          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });

        setBooks(response.data.uploads.reverse());
      } catch (err) {
        console.error("Error fetching books:", err);
      }
    };

    fetchBooks();
  }, []);
  // console.log("Book data:", book);
  return (

    <div className="bg-white min-h-screen p-0">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Uploaded Books</h2>

        {books.length === 0 ? (
          <p className="text-gray-500">No books found.</p>
        ) : (
          <div className="grid grid-cols-1 gap-x-1 gap-y-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {books.map((book, index) => {
              console.log("Book data:", book);
              return (
                <div
                  key={index}
                  className={`w-40 border p-1 rounded-lg shadow-lg relative transition-all duration-300
                    ${selectedBookId === book.book_id ? "border border-red-500 border-dashed font-bold bg-red-100" : ""}
                  `}
                  onClick={() => {
                    setSelectedBookId(book.book_id);
                    navigate("/excelViewer", {
                    state: {
                      structuredDataUrl: book.structuredDataUrl,
                      book_id: book.book_id,
                      filename: book.filename,
                      fileUrl: book.fileUrl
                    }
                  });
                  }}


                >
                  <img
                    alt={book.filename}
                    src={book.preview_url?.startsWith("http") ? book.preview_url : `${api}/api/uploads/${book.preview_url}`}
                    className="w-full h-40 object-cover rounded-lg"
                  />

                  <div className="relative h-6 mt-4 text-sm text-gray-700 text-center">
                    <p
                      className="line-clamp-1 break-words whitespace-nowrap hover:whitespace-normal hover:line-clamp-none absolute bg-white left-0 right-0 px-1 py-0.5 rounded shadow-lg z-10"
                    >
                      {book.filename}
                    </p>
                  </div>
                </div>
              );
            })}

          </div>
        )}
      </div>
    </div>
  );

}
