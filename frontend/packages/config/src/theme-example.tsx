import React from 'react'
import { Button, Card, H1, H2, H3, Paragraph, Theme, View, XStack, YStack } from 'tamagui'

/**
 * Material Design 3 テーマのデモンストレーション用コンポーネント
 * 
 * 使用方法:
 * <ThemeExample />
 */
export const ThemeExample = () => {
  return (
    <YStack padding="$4" space="$4">
      <H1>Material Design 3 テーマデモ</H1>
      
      {/* ライトテーマ */}
      <Theme name="material_light">
        <Card padding="$4" bordered>
          <H2>ライトテーマ</H2>
          <YStack space="$3">
            <XStack space="$3">
              <Button theme="primary">Primary Button</Button>
              <Button theme="secondary">Secondary Button</Button>
              <Button theme="tertiary">Tertiary Button</Button>
            </XStack>
            <XStack space="$3">
              <Button theme="red">Error Button</Button>
              <Button theme="green">Success Button</Button>
              <Button theme="blue">Info Button</Button>
            </XStack>
            <Paragraph>
              このテキストはMaterial Design 3のタイポグラフィシステムを使用しています。
              色彩はアクセシビリティガイドラインに準拠しています。
            </Paragraph>
          </YStack>
        </Card>
      </Theme>
      
      {/* ダークテーマ */}
      <Theme name="material_dark">
        <Card padding="$4" bordered>
          <H2>ダークテーマ</H2>
          <YStack space="$3">
            <XStack space="$3">
              <Button theme="primary">Primary Button</Button>
              <Button theme="secondary">Secondary Button</Button>
              <Button theme="tertiary">Tertiary Button</Button>
            </XStack>
            <XStack space="$3">
              <Button theme="red">Error Button</Button>
              <Button theme="green">Success Button</Button>
              <Button theme="blue">Info Button</Button>
            </XStack>
            <Paragraph>
              ダークテーマでは、コントラストと読みやすさを重視した色彩設計を行っています。
              Material Design 3のガイドラインに従って実装されています。
            </Paragraph>
          </YStack>
        </Card>
      </Theme>
      
      {/* カラーパレット表示 */}
      <Card padding="$4" bordered>
        <H2>カラーパレット</H2>
        <YStack space="$2">
          <H3>Primary Colors</H3>
          <XStack space="$2">
            <View width={60} height={60} backgroundColor="#6442d6" borderRadius="$2" />
            <View width={60} height={60} backgroundColor="#e8ddff" borderRadius="$2" />
            <View width={60} height={60} backgroundColor="#d0bcff" borderRadius="$2" />
          </XStack>
          
          <H3>Secondary Colors</H3>
          <XStack space="$2">
            <View width={60} height={60} backgroundColor="#5d5d74" borderRadius="$2" />
            <View width={60} height={60} backgroundColor="#e2e0fc" borderRadius="$2" />
            <View width={60} height={60} backgroundColor="#c6c4df" borderRadius="$2" />
          </XStack>
          
          <H3>Tertiary Colors</H3>
          <XStack space="$2">
            <View width={60} height={60} backgroundColor="#7d526b" borderRadius="$2" />
            <View width={60} height={60} backgroundColor="#f1d3f9" borderRadius="$2" />
            <View width={60} height={60} backgroundColor="#d5b7dc" borderRadius="$2" />
          </XStack>
        </YStack>
      </Card>
    </YStack>
  )
}

export default ThemeExample