import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import QRCode from "react-native-qrcode-svg";

const QRPage = () => {
  const { id } = useLocalSearchParams();

 

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-xl font-bold mb-4 text-indigo-600">
        Scan QR Code
      </Text>
      <QRCode value={id} size={250} />
      <Text className="mt-4 text-slate-500 text-center">
        Gate Pass ID: {id}
      </Text>
    </View>
  );
};

export default QRPage;
