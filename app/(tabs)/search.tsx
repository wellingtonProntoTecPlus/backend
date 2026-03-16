import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { TechnicianCard } from "@/components/segtec/TechnicianCard";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/lib/app-context";
import { trpc } from "@/lib/trpc";
import { SERVICE_CATEGORIES } from "@/lib/mock-data";
import { ServiceCategory, TechnicianType, Technician } from "@/lib/types";

type SortOption = "avaliacao" | "distancia" | "servicos";

export default function SearchScreen() {
  const colors = useColors();
  const { technicians: localTechnicians, user } = useAppContext();
  const params = useLocalSearchParams<{ query?: string; category?: string }>();

  // Buscar técnicos do servidor (com fallback para dados locais)
  const { data: serverTechnicians } = trpc.technicians.list.useQuery(undefined, {
    staleTime: 30_000, // 30s de cache
  });

  // Mesclar técnicos do servidor com os locais (servidor tem prioridade)
  const technicians = useMemo(() => {
    if (!serverTechnicians || serverTechnicians.length === 0) return localTechnicians;
    // Converter formato do servidor para o formato local
    const serverConverted: Technician[] = serverTechnicians.map((t) => ({
      id: `server_${t.id}`,
      name: t.name,
      companyName: t.companyName ?? undefined,
      document: t.document ?? "",
      city: t.city,
      state: t.state,
      address: t.addressStreet ? {
        street: t.addressStreet,
        number: t.addressNumber ?? undefined,
        neighborhood: t.addressNeighborhood ?? undefined,
        city: t.city,
        state: t.state,
        zipCode: t.addressZipCode ?? undefined,
        lat: t.addressLat ? Number(t.addressLat) : undefined,
        lng: t.addressLng ? Number(t.addressLng) : undefined,
      } : undefined,
      type: t.type,
      badge: t.badge,
      level: t.level,
      availability: t.availability,
      avatar: t.avatarUrl ?? t.photoUri ?? "",
      photoUri: t.photoUri ?? undefined,
      specialties: (t.specialties as ServiceCategory[]) ?? [],
      rating: Number(t.rating ?? 5),
      totalReviews: t.totalReviews,
      totalServices: t.totalServices,
      yearsExperience: t.yearsExperience,
      phone: t.phone,
      whatsapp: t.whatsapp ?? t.phone,
      description: t.description ?? "",
      workPhotos: [],
      reviews: [],
      planType: t.planType,
    }));
    // Combinar: técnicos do servidor + locais que não estão no servidor
    const serverIds = new Set(serverConverted.map((t) => t.id));
    const localOnly = localTechnicians.filter((t) => !serverIds.has(t.id));
    return [...serverConverted, ...localOnly];
  }, [serverTechnicians, localTechnicians]);

  const [searchQuery, setSearchQuery] = useState(params.query || "");
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(
    (params.category as ServiceCategory) || null
  );
  const [selectedType, setSelectedType] = useState<TechnicianType | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("avaliacao");

  // Filtro por cidade do usuário
  const userCity = user.city || user.address?.city || "";
  const [filterByCity, setFilterByCity] = useState(!!userCity);

  const filteredTechnicians = useMemo(() => {
    let result = [...technicians];

    // Filtrar por cidade quando ativo
    if (filterByCity && userCity) {
      const city = userCity.toLowerCase();
      result = result.filter(
        (t) => t.city.toLowerCase().includes(city) || city.includes(t.city.toLowerCase())
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.companyName?.toLowerCase().includes(q) ||
          t.city.toLowerCase().includes(q) ||
          t.specialties.some((s) => s.includes(q))
      );
    }

    if (selectedCategory) {
      result = result.filter((t) => t.specialties.includes(selectedCategory));
    }

    if (selectedType) {
      result = result.filter((t) => t.type === selectedType);
    }

    result.sort((a, b) => {
      if (sortBy === "avaliacao") return b.rating - a.rating;
      if (sortBy === "distancia") return (a.distance || 99) - (b.distance || 99);
      if (sortBy === "servicos") return b.totalServices - a.totalServices;
      return 0;
    });

    return result;
  }, [technicians, searchQuery, selectedCategory, selectedType, sortBy, filterByCity, userCity]);

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <MaterialIcons name="search" size={20} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Buscar técnico ou serviço..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <MaterialIcons name="close" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filtros de Categoria */}
      <View style={[styles.filtersContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          <Pressable
            onPress={() => setSelectedCategory(null)}
            style={[
              styles.filterChip,
              {
                backgroundColor: !selectedCategory ? "#1A3A5C" : colors.background,
                borderColor: !selectedCategory ? "#1A3A5C" : colors.border,
              },
            ]}
          >
            <Text style={[styles.filterChipText, { color: !selectedCategory ? "#fff" : colors.foreground }]}>
              Todos
            </Text>
          </Pressable>
          {SERVICE_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => setSelectedCategory(selectedCategory === cat.id ? null : (cat.id as ServiceCategory))}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedCategory === cat.id ? cat.color : colors.background,
                  borderColor: selectedCategory === cat.id ? cat.color : colors.border,
                },
              ]}
            >
              <MaterialIcons
                name={cat.icon as any}
                size={13}
                color={selectedCategory === cat.id ? "#fff" : cat.color}
              />
              <Text
                style={[
                  styles.filterChipText,
                  { color: selectedCategory === cat.id ? "#fff" : colors.foreground },
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Filtro por cidade */}
      {userCity ? (
        <Pressable
          onPress={() => setFilterByCity((v) => !v)}
          style={[styles.cityFilterRow, { backgroundColor: filterByCity ? "#1A3A5C10" : colors.background, borderBottomColor: colors.border }]}
        >
          <MaterialIcons
            name={filterByCity ? "location-on" : "location-off"}
            size={16}
            color={filterByCity ? "#1A3A5C" : colors.muted}
          />
          <Text style={[styles.cityFilterText, { color: filterByCity ? "#1A3A5C" : colors.muted }]}>
            {filterByCity ? `Mostrando técnicos em ${userCity}` : "Mostrando todos os técnicos"}
          </Text>
          <Text style={[styles.cityFilterToggle, { color: filterByCity ? "#F5A623" : colors.muted }]}>
            {filterByCity ? "Ver todos" : "Filtrar por cidade"}
          </Text>
        </Pressable>
      ) : null}

      {/* Filtros de tipo e ordenação */}
      <View style={[styles.sortRow, { backgroundColor: colors.background }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortContent}>
          {(["empresa", "autonomo"] as TechnicianType[]).map((type) => (
            <Pressable
              key={type}
              onPress={() => setSelectedType(selectedType === type ? null : type)}
              style={[
                styles.sortChip,
                {
                  backgroundColor: selectedType === type ? "#1A3A5C20" : "transparent",
                  borderColor: selectedType === type ? "#1A3A5C" : colors.border,
                },
              ]}
            >
              <Text style={[styles.sortChipText, { color: selectedType === type ? "#1A3A5C" : colors.muted }]}>
                {type === "empresa" ? "Empresa" : "Autônomo"}
              </Text>
            </Pressable>
          ))}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {(["avaliacao", "distancia", "servicos"] as SortOption[]).map((sort) => (
            <Pressable
              key={sort}
              onPress={() => setSortBy(sort)}
              style={[
                styles.sortChip,
                {
                  backgroundColor: sortBy === sort ? "#F5A62320" : "transparent",
                  borderColor: sortBy === sort ? "#F5A623" : colors.border,
                },
              ]}
            >
              <MaterialIcons
                name={sort === "avaliacao" ? "star" : sort === "distancia" ? "place" : "work"}
                size={12}
                color={sortBy === sort ? "#F5A623" : colors.muted}
              />
              <Text style={[styles.sortChipText, { color: sortBy === sort ? "#F5A623" : colors.muted }]}>
                {sort === "avaliacao" ? "Avaliação" : sort === "distancia" ? "Distância" : "Serviços"}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Resultados */}
      <View style={[styles.resultsHeader, { backgroundColor: colors.background }]}>
        <Text style={[styles.resultsCount, { color: colors.muted }]}>
          {filteredTechnicians.length} técnico{filteredTechnicians.length !== 1 ? "s" : ""} encontrado{filteredTechnicians.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <FlatList
        data={filteredTechnicians}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TechnicianCard
            technician={item}
            onPress={() => router.push({ pathname: "/technician/[id]", params: { id: item.id } })}
          />
        )}
        contentContainerStyle={[styles.listContent, { backgroundColor: colors.background }]}
        style={{ backgroundColor: colors.background }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="search-off" size={48} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Nenhum técnico encontrado
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.muted }]}>
              Tente ajustar os filtros ou buscar por outra especialidade
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 12,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  filtersContainer: {
    borderBottomWidth: 1,
  },
  filtersRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sortRow: {
    paddingVertical: 4,
  },
  sortContent: {
    paddingHorizontal: 12,
    gap: 6,
    alignItems: "center",
  },
  sortChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  divider: {
    width: 1,
    height: 20,
    marginHorizontal: 2,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: "500",
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  cityFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  cityFilterText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
  },
  cityFilterToggle: {
    fontSize: 12,
    fontWeight: "600",
  },
});
