'use client';

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import { AffiliateOffer } from '../utils/parseCSV';
import { useState } from 'react';

interface TableProps {
  data: AffiliateOffer[];
}

export default function Table({ data }: TableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns: ColumnDef<AffiliateOffer>[] = [
    {
      accessorKey: 'name',
      header: 'Название',
      cell: (info) => (
        <div className="font-medium text-white">{info.getValue() as string}</div>
      ),
    },
    {
      accessorKey: 'topic',
      header: 'Тематика',
      cell: (info) => (
        <div className="text-gray-300">{info.getValue() as string}</div>
      ),
    },
    {
      accessorKey: 'country',
      header: 'Страна',
      cell: (info) => (
        <div className="text-gray-300">{info.getValue() as string}</div>
      ),
    },
    {
      accessorKey: 'model',
      header: 'Модель',
      cell: (info) => (
        <div className="text-gray-300">{info.getValue() as string}</div>
      ),
    },
    {
      accessorKey: 'cr',
      header: 'CR',
      cell: (info) => {
        const value = info.getValue() as number;
        return (
          <div className="text-gray-300 text-right">
            {value > 0 ? value.toFixed(2) : 'N/A'}
          </div>
        );
      },
    },
    {
      accessorKey: 'ecpc',
      header: 'eCPC',
      cell: (info) => {
        const value = info.getValue() as number;
        return (
          <div className="text-gray-300 text-right">
            {value > 0 ? value.toFixed(2) : 'N/A'}
          </div>
        );
      },
    },
    {
      accessorKey: 'epc',
      header: 'EPC',
      cell: (info) => {
        const value = info.getValue() as number;
        return (
          <div className="text-gray-300 text-right">
            {value > 0 ? value.toFixed(2) : 'N/A'}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-gray-700">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-6 py-4 text-left text-sm font-semibold text-gray-300 bg-gray-800 cursor-pointer hover:bg-gray-750 select-none"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-2">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{
                      asc: ' ↑',
                      desc: ' ↓',
                    }[header.column.getIsSorted() as string] ?? null}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-gray-800 hover:bg-gray-800 transition-colors"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-6 py-4">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
