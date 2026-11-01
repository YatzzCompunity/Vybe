import React from "react";

interface SearchBarProps {
  defaultValue?: string;
  categoryFilter?: string;
  compact?: boolean;
  placeholder?: string;
}

export function SearchBar({
  defaultValue = "",
  categoryFilter,
  compact = false,
  placeholder = "Search sample articles, topics, tags...",
}: SearchBarProps) {
  return (
    <form
      action="/search"
      method="GET"
      role="search"
      aria-label="Search articles"
      className=" flex w-full items-center gap-1.5"
    >
      {categoryFilter ? (
        <input type="hidden" name="category" value={categoryFilter} />
      ) : null}
      <label htmlFor={compact ? "header-search-input" : "page-search-input"} className="sr-only">
        Search articles
      </label>
      <input
        id={compact ? "header-search-input" : "page-search-input"}
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={`w-full rounded-full border border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-500 transition focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-400 dark:focus:border-indigo-400 dark:focus:bg-slate-950 ${
          compact ? "px-3.5 py-1.5 text-xs sm:text-sm" : "px-4 py-2.5 text-sm sm:text-base"
        }`}
      />
      <button
        type="submit"
        className={`shrink-0 rounded-full bg-slate-900 font-semibold text-white transition hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 ${
          compact ? "px-3.5 py-1.5 text-xs sm:text-sm" : "px-5 py-2.5 text-sm sm:text-base"
        }`}
      >
        Search
      </button>
    </form>
  );
}

export default SearchBar;
