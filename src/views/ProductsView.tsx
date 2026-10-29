import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Product, ProductVariant, SegmentType } from '../types';
import { formatBRL, calculateMarkup, calculateGrossMargin } from '../utils/currency';
import {
  Package,
  Plus,
  Search,
  Filter,
  Layers,
  Edit2,
  Trash2,
  AlertTriangle,
  Download,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';

export const ProductsView: React.FC = () => {
  const { products, categories, brands, suppliers, saveProduct, deleteProduct, currentUser } = useApp();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyLowStock, setOnlyLowStock] = useState<boolean>(false);

  // Edit / Create modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm));

    const matchesSegment = selectedSegment === 'all' || p.segment === selectedSegment;
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchesLowStock = !onlyLowStock || p.currentStock <= p.minStock;

    return matchesSearch && matchesSegment && matchesCategory && matchesLowStock;
  });

  const handleOpenCreate = () => {
    setEditingProduct({
      name: '',
      sku: '',
      barcode: '',
      segment: 'moda',
      categoryId: categories[0]?.id || '',
      brandId: brands[0]?.id || '',
      supplierId: suppliers[0]?.id || '',
      unitMeasure: 'UN',
      costPrice: 0,
      salePrice: 0,
      currentStock: 10,
      minStock: 5,
      maxStock: 50,
      imageUrl: '',
      variants: [],
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct({ ...p });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct?.salePrice) return;
    saveProduct(editingProduct);
    setIsModalOpen(false);
  };

  const handleExportCSV = () => {
    const headers = ['Nome', 'SKU', 'Código de Barras', 'Segmento', 'Estoque', 'Custo', 'Venda'];
    const rows = filteredProducts.map((p) => [
      `"${p.name}"`,
      `"${p.sku}"`,
      `"${p.barcode || ''}"`,
      `"${p.segment}"`,
      p.currentStock,
      p.costPrice.toFixed(2),
      p.salePrice.toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vendix_produtos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-xl font-black text-white font-['Montserrat'] flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-400" />
            <span>Catálogo de Produtos & Grades</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Gestão de roupas, calçados, maquiagens, cosméticos, bijuterias e variedades com controle de variantes e lotes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-950/40 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-900/50 p-3 rounded-2xl border border-slate-800 text-xs">
        {/* Search */}
        <div className="lg:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nome, SKU ou código de barras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Segment filter */}
        <div>
          <select
            value={selectedSegment}
            onChange={(e) => setSelectedSegment(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all">Todos os Segmentos</option>
            <option value="moda">Moda (Roupas/Calçados)</option>
            <option value="cosmeticos">Cosméticos & Makes</option>
            <option value="acessorios">Bolsas & Bijuterias</option>
            <option value="variedades">Variedades & Presentes</option>
          </select>
        </div>

        {/* Category filter */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all">Todas as Categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Low stock toggle button */}
        <div className="flex items-center">
          <button
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            className={`w-full py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-semibold transition-all ${
              onlyLowStock
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Apenas Estoque Baixo</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">SKU / Código</th>
                <th className="px-4 py-3">Segmento</th>
                <th className="px-4 py-3">Custo / Venda</th>
                <th className="px-4 py-3">Margem</th>
                <th className="px-4 py-3 text-center">Estoque Atual</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Nenhum produto encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const markup = calculateMarkup(p.costPrice, p.salePrice);
                  const margin = calculateGrossMargin(p.costPrice, p.salePrice);
                  const isLow = p.currentStock <= p.minStock;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-white flex items-center gap-3">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover shrink-0 bg-slate-800"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-white text-xs">{p.name}</p>
                          {p.variants && p.variants.length > 0 && (
                            <span className="text-[10px] text-purple-400 font-semibold">
                              {p.variants.length} variantes (grades/tamanhos)
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono text-slate-400">
                        <p>{p.sku}</p>
                        <p className="text-[10px] text-slate-500">{p.barcode}</p>
                      </td>

                      <td className="px-4 py-3 capitalize">
                        <span className="bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700 text-[11px]">
                          {p.segment}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <p className="text-slate-400 text-[11px]">Custo: {formatBRL(p.costPrice)}</p>
                        <p className="font-bold text-emerald-400 text-xs">Venda: {formatBRL(p.salePrice)}</p>
                      </td>

                      <td className="px-4 py-3">
                        <span className="text-emerald-400 font-bold">{margin.toFixed(1)}%</span>
                        <p className="text-[10px] text-slate-500">Markup: {markup.toFixed(1)}%</p>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full font-bold text-xs border ${
                            isLow
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}
                        >
                          {p.currentStock} {p.unitMeasure}
                        </span>
                        <p className="text-[10px] text-slate-500 mt-0.5">mín: {p.minStock}</p>
                      </td>

                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                          title="Editar Produto"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id)}
                          className="p-1.5 hover:bg-rose-500/20 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
                          title="Excluir Produto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Create/Edit Modal */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">
                {editingProduct.id ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">Nome do Produto</label>
                  <input
                    type="text"
                    value={editingProduct.name || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">SKU (Código Interno)</label>
                  <input
                    type="text"
                    value={editingProduct.sku || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Código de Barras (EAN-13)</label>
                  <input
                    type="text"
                    value={editingProduct.barcode || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Segmento</label>
                  <select
                    value={editingProduct.segment || 'moda'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, segment: e.target.value as SegmentType })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="moda">Moda (Vestuário & Calçados)</option>
                    <option value="cosmeticos">Cosméticos & Perfumaria</option>
                    <option value="acessorios">Bijuterias & Bolsas</option>
                    <option value="variedades">Variedades & Presentes</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Categoria</label>
                  <select
                    value={editingProduct.categoryId || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Preço de Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingProduct.costPrice || 0}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, costPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Preço de Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingProduct.salePrice || 0}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, salePrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-emerald-400 font-bold focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Estoque Atual</label>
                  <input
                    type="number"
                    value={editingProduct.currentStock || 0}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, currentStock: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Estoque Mínimo (Alerta)</label>
                  <input
                    type="number"
                    value={editingProduct.minStock || 5}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, minStock: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">URL da Imagem</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={editingProduct.imageUrl || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-950/40"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
