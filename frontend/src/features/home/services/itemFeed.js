export function filterHomeItems(items, { searchQuery, selectedCategory, selectedCondition }) {
  return items.filter((item) => {
    const title = item.title || ''
    const description = item.description || ''
    const matchesQuery =
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All Categories' || item.category === selectedCategory
    const matchesCondition =
      selectedCondition === 'All Conditions' || item.item_condition === selectedCondition
    return matchesQuery && matchesCategory && matchesCondition
  })
}

