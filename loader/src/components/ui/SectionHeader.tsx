import { Text } from "./Text";

export function SectionHeader({
  description,
  title,
}: {
  description: string
  title: string
}) {
  return (
    <div className="section-header">
      <Text as="h2" variant="h2">
        {title}
      </Text>
      <Text variant="body">{description}</Text>
    </div>
  )
}
