// Mock do react-native-maps para web — o mapa nativo não está disponível na plataforma web
import React from "react";
import { View } from "react-native";

const MapView = (props: any) => React.createElement(View, props);
const Marker = (props: any) => React.createElement(View, props);
const Callout = (props: any) => React.createElement(View, props);

export default MapView;
export { Marker, Callout };
