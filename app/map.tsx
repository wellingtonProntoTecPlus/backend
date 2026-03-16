import React, { useState } from "react";
const mapRef = React.useRef<MapView | null>(null);

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform
} from "react-native";

import MapView, { Marker, Callout } from "react-native-maps";

import * as Location from "expo-location";
import MapViewDirections from "react-native-maps-directions";

import { useColors } from "../hooks/useColors";
import { useAppContext } from "@/lib/app-context";

       const BASE_LAT = -18.6473;
       const BASE_LNG = -48.1870;

type TechWithPos = Technician & { latitude: number; longitude: number };

export default function MapScreen() {
  const colors = useColors();
  const { technicians } = useAppContext();
  const [duration, setDuration] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [selectedTech, setSelectedTech] = useState<TechWithPos | null>(null);
  const [filterAvailable, setFilterAvailable] = useState(false);
  const [userLocation, setUserLocation] = useState<{
  latitude: number;
  longitude: number;
} | null>(null);
  // Usar coordenadas reais do endereço quando disponíveis, caso contrário distribui ao redor da cidade base
  const techPositions: TechWithPos[] = React.useMemo(() => {
    return technicians.map((tech, index) => {
      if (tech.address?.lat && tech.address?.lng) {
        return { ...tech, latitude: tech.address.lat, longitude: tech.address.lng };
      }
      return {
        ...tech,
        latitude: BASE_LAT + Math.sin(index * 1.5) * 0.025,
        longitude: BASE_LNG + Math.cos(index * 1.5) * 0.03,
      };
    });
  }, [technicians]);

  const filteredTechs = filterAvailable
  ? techPositions.filter((t) => t.availability === "disponivel")
  : techPositions;

  function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
  }

  const nearestTech = React.useMemo(() => {
  if (!userLocation || filteredTechs.length === 0) return null;

  let nearest: TechWithPos | null = null;
  let minDist = Infinity;

  for (const tech of filteredTechs) {
    const d = distanceKm(
      userLocation.latitude,
      userLocation.longitude,
      tech.latitude,
      tech.longitude
    );

    if (d < minDist) {
      minDist = d;
      nearest = tech;
    }
  }

  return nearest;
  }, [filteredTechs, userLocation]);
  return R * c;
}

    React.useEffect(() => {
  (async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      console.log("Permissão de localização negada");
      return;
    }

    const location = await Location.getCurrentPositionAsync({});

    setUserLocation({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
  })();
}, []);
      React.useEffect(() => {
  if (!userLocation || !selectedTech || !mapRef.current) return;

    mapRef.current.fitToCoordinates(
     [
      userLocation,
      {
        latitude: selectedTech.latitude,
        longitude: selectedTech.longitude,
       },
     ],
     {
      edgePadding: { top: 120, right: 60, bottom: 200, left: 60 },
      animated: true,
     }
     );
     }, [selectedTech]);
 
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#1A3A5C" }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Técnicos Próximos</Text>
        <TouchableOpacity
          onPress={() => setFilterAvailable(!filterAvailable)}
          activeOpacity={0.8}
          style={[
            styles.filterBtn,
            { backgroundColor: filterAvailable ? "#F59E0B" : "rgba(255,255,255,0.2)" },
          ]}
        >
          <MaterialIcons name="filter-list" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filtro ativo */}
      {filterAvailable && (
        <View style={[styles.filterBanner, { backgroundColor: "#22C55E15", borderBottomColor: "#22C55E30" }]}>
          <MaterialIcons name="check-circle" size={14} color="#22C55E" />
          <Text style={[styles.filterBannerText, { color: "#22C55E" }]}>
            Mostrando apenas técnicos disponíveis agora
          </Text>
          <TouchableOpacity onPress={() => setFilterAvailable(false)} activeOpacity={0.7}>
            <MaterialIcons name="close" size={16} color="#22C55E" />
          </TouchableOpacity>
        </View>
      )}

      {/* Mapa nativo */}
      <View style={{ flex: 1 }}>
        <MapView
          style={StyleSheet.absoluteFillObject}
           initialRegion={{
           latitude: userLocation?.latitude || BASE_LAT,
           longitude: userLocation?.longitude || BASE_LNG,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          }}
          showsUserLocation
          showsMyLocationButton
        >
           {userLocation && selectedTech && (
           <MapViewDirections
             origin={userLocation}
             destination={{
             latitude: selectedTech.latitude,
             longitude: selectedTech.longitude,
            }}
              apikey="AIzaSyBhpm9iV7NyBDUvlY5xWC7Hj7sD-mfy9EI"
             strokeWidth={4}
             strokeColor="#1A3A5C"
              onReady={(result) => {
              setDuration(result.duration);
              setDistance(result.distance);
              }}
           />
          )}
          {userLocation && (
            <Marker
              coordinate={userLocation}
              title="Você está aqui"
              pinColor="blue"
             />
           )}
          {filteredTechs.map((tech) => {
            const initials = tech.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("");
            const dotColor = AVAILABILITY_COLORS[tech.availability] ?? "#9BA1A6";
            return (
              <Marker            
                key={tech.id}
                coordinate={{ latitude: tech.latitude, longitude: tech.longitude }}
                onPress={() => setSelectedTech(tech)}
                pinColor={nearestTech?.id === tech.id ? "gold" : undefined}
                 > 
                
                {/* Ícone personalizado com iniciais */}
                <View style={[styles.markerContainer, { borderColor: dotColor }]}>
                  <Text style={styles.markerInitials}>{initials}</Text>
                  <View style={[styles.markerDot, { backgroundColor: dotColor }]} />
                </View>
                <Callout tooltip onPress={() => setSelectedTech(tech)}>
                  <View style={styles.callout}>
                    <Text style={styles.calloutName}>{tech.name}</Text>
                    <Text style={[styles.calloutStatus, { color: dotColor }]}>
                      {AVAILABILITY_LABELS[tech.availability]}
                    </Text>
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapView>

        {/* Legenda flutuante */}
        <View style={[styles.legend, { backgroundColor: "rgba(255,255,255,0.95)" }]}>
          {Object.entries(AVAILABILITY_COLORS).map(([key, color]) => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{AVAILABILITY_LABELS[key]}</Text>
            </View>
          ))}
        </View>

        {/* Contador flutuante */}
        <View style={[styles.counter, { backgroundColor: "#1A3A5C" }]}>
          <Text style={styles.counterText}>
            {filteredTechs.length} técnico{filteredTechs.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Card do técnico selecionado */}
      {selectedTech ? (
        <View style={[styles.selectedCard, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.selectedCardHeader}>
            <View style={[styles.selectedAvatar, { backgroundColor: "#1A3A5C" }]}>
              <Text style={styles.selectedAvatarText}>
                {selectedTech.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.selectedName, { color: colors.foreground }]}>{selectedTech.name}</Text>
              <View style={styles.selectedMeta}>
                <View style={[styles.availDot, { backgroundColor: AVAILABILITY_COLORS[selectedTech.availability] }]} />
                <Text style={[styles.availText, { color: AVAILABILITY_COLORS[selectedTech.availability] }]}>
                  {AVAILABILITY_LABELS[selectedTech.availability]}
                </Text>
              </View>
            </View>
            <View style={styles.ratingBox}>
              <MaterialIcons name="star" size={14} color="#F59E0B" />
              <Text style={[styles.ratingText, { color: colors.foreground }]}>{selectedTech.rating}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedTech(null)} style={{ padding: 4 }} activeOpacity={0.7}>
              <MaterialIcons name="close" size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.selectedSpecialties, { color: colors.muted }]} numberOfLines={1}>
            {selectedTech.specialties.slice(0, 3).join(" • ")}
          </Text>
          <View style={styles.selectedActions}>
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/technician/[id]", params: { id: selectedTech.id } } as any)}
              style={[styles.viewBtn, { borderColor: "#1A3A5C" }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.viewBtnText, { color: "#1A3A5C" }]}>Ver perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/request/new", params: { technicianId: selectedTech.id } } as any)}
              style={[styles.requestBtn, { backgroundColor: "#1A3A5C" }]}
              activeOpacity={0.85}
            >
              <MaterialIcons name="build" size={16} color="#fff" />
              <Text style={styles.requestBtnText}>Solicitar serviço</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Lista compacta de técnicos */
        <View style={[styles.listContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Text style={[styles.listTitle, { color: colors.foreground }]}>
            {filteredTechs.length} técnico{filteredTechs.length !== 1 ? "s" : ""} na região
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listScroll}>
            {filteredTechs.map((tech) => (
              <TouchableOpacity
                key={tech.id}
                onPress={() => setSelectedTech(tech)}
                activeOpacity={0.85}
                style={[styles.miniCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={[styles.miniAvatar, { backgroundColor: "#1A3A5C" }]}>
                  <Text style={styles.miniAvatarText}>
                    {tech.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                  </Text>
                </View>
                <View style={[styles.miniDot, { backgroundColor: AVAILABILITY_COLORS[tech.availability] }]} />
                <Text style={[styles.miniName, { color: colors.foreground }]} numberOfLines={1}>
                  {tech.name.split(" ")[0]}
                </Text>
                <View style={styles.miniRating}>
                  <MaterialIcons name="star" size={10} color="#F59E0B" />
                  <Text style={[styles.miniRatingText, { color: colors.muted }]}>{tech.rating}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {filteredTechs.length === 0 && (
              <View style={styles.emptyList}>
                <Text style={[styles.emptyText, { color: colors.muted }]}>
                  {filterAvailable ? "Nenhum técnico disponível agora" : "Nenhum técnico cadastrado"}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 52 : 44,
    paddingBottom: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  filterBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
  },
  // Marcador personalizado
  markerContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerInitials: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A3A5C",
  },
  markerDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#fff",
  },
  // Callout
  callout: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 8,
    minWidth: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  calloutName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A3A5C",
    marginBottom: 2,
  },
  calloutStatus: {
    fontSize: 11,
    fontWeight: "500",
  },
  // Legenda
  legend: {
    position: "absolute",
    bottom: 12,
    left: 12,
    borderRadius: 10,
    padding: 8,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: "#374151",
    fontWeight: "500",
  },
  // Contador
  counter: {
    position: "absolute",
    top: 12,
    right: 12,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  counterText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  // Card selecionado
  selectedCard: {
    padding: 16,
    borderTopWidth: 1,
  },
  selectedCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  selectedAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedAvatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  selectedName: {
    fontSize: 16,
    fontWeight: "700",
  },
  selectedMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  availDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  availText: {
    fontSize: 12,
    fontWeight: "500",
  },
  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "700",
  },
  selectedSpecialties: {
    fontSize: 13,
    marginBottom: 12,
  },
  selectedActions: {
    flexDirection: "row",
    gap: 10,
  },
  viewBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  viewBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  requestBtn: {
    flex: 2,
    height: 40,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  requestBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  // Lista compacta
  listContainer: {
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  listScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  miniCard: {
    width: 72,
    alignItems: "center",
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  miniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  miniAvatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  miniDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  miniName: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  miniRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  miniRatingText: {
    fontSize: 10,
  },
  emptyList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 13,
  },
});
